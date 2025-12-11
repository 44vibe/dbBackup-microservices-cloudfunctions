const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Storage } = require('@google-cloud/storage');
const { Client } = require('ssh2');

const secretClient = new SecretManagerServiceClient();
const storage = new Storage();
const projectId = 'gcf-course-478410';
const bucketName = 'postgresql-server-backups';
const collectionName = 'test_collection'; // Can be made dynamic via Pub/Sub message if needed

/**
 * Cloud Function triggered by Pub/Sub for QdrantDB backup
 */
exports.qdrantdbBackupHandler = async (message, context) => {
    console.log('QdrantDB backup triggered!');
    console.log('Message data:', Buffer.from(message.data, 'base64').toString());

    try {
        // 1. Retrieve secrets
        console.log('Retrieving secrets from Secret Manager...');

        const [sshKeyResponse] = await secretClient.accessSecretVersion({
            name: `projects/${projectId}/secrets/cf-backup-ssh-key/versions/latest`,
        });

        const [vmIpResponse] = await secretClient.accessSecretVersion({
            name: `projects/${projectId}/secrets/cf-vm-ip/versions/latest`,
          });

        const [vmUsernameResponse] = await secretClient.accessSecretVersion({
            name: `projects/${projectId}/secrets/cf-vm-username/versions/latest`,
          });

        const sshKey = sshKeyResponse.payload.data.toString();
        const vmIp = vmIpResponse.payload.data.toString().trim();
        const vmUsername = vmUsernameResponse.payload.data.toString().trim();

        console.log(`Connecting to ${vmUsername}@${vmIp}`);

        // 2. Execute backup via SSH
        console.log('Executing backup via SSH...');
        const backupInfo = await executeBackup(vmIp, vmUsername, sshKey);
        console.log('Backup created successfully:', backupInfo);

        // 3. Upload backup to GCS
        console.log(`Uploading backup to GCS bucket: ${bucketName}`);
        const uploadResult = await uploadBackupToGCS(vmIp, vmUsername, sshKey, backupInfo);
        console.log('Backup uploaded successfully:', uploadResult);

        // 4. Delete local snapshot files and compressed file from VM
        await deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo);
        console.log('Local snapshot files and compressed file deleted from VM');

    return {
        success: true,
        message: 'QdrantDB backup completed and uploaded to GCS',
        gcsPath: uploadResult.gcsPath
    };

    } catch (error) {
        console.error('Backup failed:', error);
        throw error;
    }
};

/**
 * Execute QdrantDB backup via SSH using snapshot method
 * Parses the snapshot API response and waits for snapshot files to be created
 */
function executeBackup(vmIp, vmUsername, sshKey) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established');

            // Create a readable timestamp: YYYY-MM-DD_HH-MM-SS
            const now = new Date();
            const timestamp = now.toISOString()
                .replace(/T/, '_')
                .replace(/:/g, '-')
                .replace(/\..+/, '');
            // Qdrant typically stores snapshots in its storage directory
            // Common locations: /var/lib/qdrant/storage/collections/{collection}/snapshots/
            // or ~/qdrant_snapshots/{collection} if custom configured
            const defaultSnapshotDir = `/var/lib/qdrant/storage/collections/${collectionName}/snapshots`;
            const customSnapshotDir = `~/qdrant_snapshots/${collectionName}`;

            // QdrantDB snapshot backup command
            // 1. Trigger snapshot via Qdrant API and parse JSON response
            // 2. Extract snapshot name from response
            const backupCommand = `
                response=$(curl -s -X POST http://localhost:6333/collections/${collectionName}/snapshots) && \
                echo "$response" && \
                snapshot_name=$(echo "$response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4) && \
                echo "SNAPSHOT_NAME=$snapshot_name"
            `;

            conn.exec(backupCommand, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                let output = '';
                let errorOutput = '';
                let snapshotName = null;

                stream.on('data', (data) => {
                    const dataStr = data.toString();
                    output += dataStr;
                    console.log('STDOUT:', dataStr);
                    
                    // Extract snapshot name from output
                    const nameMatch = dataStr.match(/SNAPSHOT_NAME=([^\s]+)/);
                    if (nameMatch) {
                        snapshotName = nameMatch[1];
                    }
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.log('STDERR:', data.toString());
                });

                stream.on('close', async (code) => {
                    if (code !== 0) {
                        conn.end();
                        return reject(new Error(`Backup command failed with code ${code}: ${errorOutput}`));
                    }

                    // Try to parse JSON response if snapshot name wasn't extracted from echo
                    if (!snapshotName) {
                        try {
                            // Extract JSON from output (between first { and last })
                            const jsonMatch = output.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                const jsonResponse = JSON.parse(jsonMatch[0]);
                                if (jsonResponse.result && jsonResponse.result.name) {
                                    snapshotName = jsonResponse.result.name;
                                }
                            }
                        } catch (parseErr) {
                            console.warn('Could not parse JSON response:', parseErr.message);
                        }
                    }

                    if (!snapshotName) {
                        conn.end();
                        return reject(new Error('Failed to extract snapshot name from API response'));
                    }

                    console.log(`Snapshot name extracted: ${snapshotName}`);

                    // Wait for snapshot files to be created and verify they exist
                    try {
                        const snapshotInfo = await waitForSnapshotFiles(
                            vmIp, 
                            vmUsername, 
                            sshKey, 
                            snapshotName, 
                            defaultSnapshotDir, 
                            customSnapshotDir
                        );

                        conn.end();
                        resolve({
                            timestamp: timestamp,
                            snapshotDir: snapshotInfo.snapshotDir,
                            snapshotName: snapshotName,
                            snapshotPath: snapshotInfo.snapshotPath,
                            checksumPath: snapshotInfo.checksumPath,
                            collectionName: collectionName,
                            message: `QdrantDB snapshot ${snapshotName} created successfully`
                        });
                    } catch (waitError) {
                        conn.end();
                        reject(waitError);
                    }
                });
            });
        });

        conn.on('error', (err) => {
            reject(err);
        });

        conn.connect({
            host: vmIp,
            port: 22,
            username: vmUsername,
            privateKey: sshKey,
        });
    });
}

/**
 * Wait for snapshot files to be created and verify they exist
 * Polls for snapshot files with exponential backoff
 */
function waitForSnapshotFiles(vmIp, vmUsername, sshKey, snapshotName, defaultDir, customDir) {
    return new Promise((resolve, reject) => {
        const maxAttempts = 30; // Maximum polling attempts
        const initialDelay = 2000; // Start with 2 seconds
        const maxDelay = 10000; // Max 10 seconds between attempts
        let attempt = 0;

        const checkSnapshotFiles = () => {
            attempt++;
            console.log(`Checking for snapshot files (attempt ${attempt}/${maxAttempts})...`);

            const conn = new Client();

            conn.on('ready', () => {
                // Check both default and custom snapshot directories
                // Snapshot files: {snapshotName}.snapshot and {snapshotName}.snapshot.checksum
                const checkCommand = `
                    snapshot_file_default="${defaultDir}/${snapshotName}" && \
                    snapshot_file_custom="${customDir}/${snapshotName}" && \
                    if [ -f "$snapshot_file_default.snapshot" ] && [ -f "$snapshot_file_default.snapshot.checksum" ]; then \
                        echo "FOUND:default:$snapshot_file_default"; \
                    elif [ -f "$snapshot_file_custom.snapshot" ] && [ -f "$snapshot_file_custom.snapshot.checksum" ]; then \
                        echo "FOUND:custom:$snapshot_file_custom"; \
                    else \
                        echo "NOT_FOUND"; \
                    fi
                `;

                conn.exec(checkCommand, (err, stream) => {
                    if (err) {
                        conn.end();
                        return setTimeout(() => {
                            if (attempt >= maxAttempts) {
                                reject(new Error(`Failed to check snapshot files after ${maxAttempts} attempts: ${err.message}`));
                            } else {
                                checkSnapshotFiles();
                            }
                        }, Math.min(initialDelay * Math.pow(1.5, attempt - 1), maxDelay));
                    }

                    let output = '';
                    let errorOutput = '';

                    stream.on('data', (data) => {
                        output += data.toString();
                        console.log('Check STDOUT:', data.toString());
                    });

                    stream.stderr.on('data', (data) => {
                        errorOutput += data.toString();
                        console.log('Check STDERR:', data.toString());
                    });

                    stream.on('close', (code) => {
                        conn.end();

                        if (code === 0) {
                            const foundMatch = output.match(/FOUND:(default|custom):(.+)/);
                            if (foundMatch) {
                                const location = foundMatch[1];
                                const basePath = foundMatch[2].trim();
                                const snapshotDir = location === 'default' ? defaultDir : customDir;
                                
                                console.log(`Snapshot files found in ${location} location: ${basePath}`);
                                resolve({
                                    snapshotDir: snapshotDir,
                                    snapshotPath: `${basePath}.snapshot`,
                                    checksumPath: `${basePath}.snapshot.checksum`
                                });
                            } else if (attempt >= maxAttempts) {
                                reject(new Error(`Snapshot files not found after ${maxAttempts} attempts. Snapshot name: ${snapshotName}`));
                            } else {
                                // Wait before next attempt with exponential backoff
                                const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), maxDelay);
                                console.log(`Snapshot files not ready yet, waiting ${delay}ms before next check...`);
                                setTimeout(checkSnapshotFiles, delay);
                            }
                        } else {
                            if (attempt >= maxAttempts) {
                                reject(new Error(`Failed to check snapshot files after ${maxAttempts} attempts: ${errorOutput}`));
                            } else {
                                const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), maxDelay);
                                setTimeout(checkSnapshotFiles, delay);
                            }
                        }
                    });
                });
            });

            conn.on('error', (err) => {
                conn.end();
                if (attempt >= maxAttempts) {
                    reject(new Error(`SSH connection error after ${maxAttempts} attempts: ${err.message}`));
                } else {
                    const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), maxDelay);
                    setTimeout(checkSnapshotFiles, delay);
                }
            });

            conn.connect({
                host: vmIp,
                port: 22,
                username: vmUsername,
                privateKey: sshKey,
            });
        };

        // Start checking
        checkSnapshotFiles();
    });
}

/**
 * Upload snapshot files from VM to Google Cloud Storage
 * Compresses the snapshot files using tar -czf before upload
 */
async function uploadBackupToGCS(vmIp, vmUsername, sshKey, backupInfo) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for compression and upload');

            const timestamp = backupInfo.timestamp;
            const snapshotPath = backupInfo.snapshotPath;
            const checksumPath = backupInfo.checksumPath;
            const compressedFilename = `qdrantdb_${backupInfo.collectionName}_${backupInfo.snapshotName}_${timestamp}.tar.gz`;
            const compressedPath = `/tmp/${compressedFilename}`;

            // Verify snapshot files exist before compressing
            // Compress both the snapshot file and its checksum file
            const compressCommand = `
                if [ ! -f "${snapshotPath}" ] || [ ! -f "${checksumPath}" ]; then \
                    echo "ERROR: Snapshot files not found at ${snapshotPath} or ${checksumPath}" && exit 1; \
                fi && \
                tar -czf ${compressedPath} -C $(dirname ${snapshotPath}) $(basename ${snapshotPath}) $(basename ${checksumPath}) && \
                echo "Compression completed: ${compressedPath}"
            `;

            console.log('Verifying and compressing snapshot files...');
            console.log(`Snapshot: ${snapshotPath}`);
            console.log(`Checksum: ${checksumPath}`);
            conn.exec(compressCommand, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                let compressOutput = '';
                let compressError = '';

                stream.on('data', (data) => {
                    compressOutput += data.toString();
                    console.log('Compress STDOUT:', data.toString());
                });

                stream.stderr.on('data', (data) => {
                    compressError += data.toString();
                    console.log('Compress STDERR:', data.toString());
                });

                stream.on('close', (code) => {
                    if (code !== 0) {
                        conn.end();
                        return reject(new Error(`Compression failed with code ${code}: ${compressError}`));
                    }

                    console.log('Snapshot compressed successfully, uploading to GCS...');

                    // Upload compressed file to GCS
                    conn.sftp((err, sftp) => {
                        if (err) {
                            conn.end();
                            return reject(err);
                        }

                        const readStream = sftp.createReadStream(compressedPath);
                        const bucket = storage.bucket(bucketName);
                        const gcsPath = `qdrantdb/${compressedFilename}`;
                        const file = bucket.file(gcsPath);
                        const writeStream = file.createWriteStream({
                            metadata: {
                                contentType: 'application/gzip',
                                metadata: {
                                    source: 'qdrantdb-backup-function',
                                    timestamp: new Date().toISOString(),
                                    collectionName: backupInfo.collectionName,
                                    backupMethod: 'snapshot'
                                }
                            }
                        });

                        readStream.on('error', (error) => {
                            conn.end();
                            reject(new Error(`Failed to read file from VM: ${error.message}`));
                        });

                        writeStream.on('error', (error) => {
                            conn.end();
                            reject(new Error(`Failed to upload to GCS: ${error.message}`));
                        });

                        writeStream.on('finish', () => {
                            conn.end();
                            resolve({
                                gcsPath: `gs://${bucketName}/${gcsPath}`,
                                bucket: bucketName,
                                filename: gcsPath,
                                compressedFilename: compressedFilename
                            });
                        });

                        readStream.pipe(writeStream);
                        console.log('Compressed snapshot uploaded to GCS successfully');
                    });
                });
            });
        });

        conn.on('error', (err) => {
            reject(err);
        });

        conn.connect({
            host: vmIp,
            port: 22,
            username: vmUsername,
            privateKey: sshKey,
        });
    });
}

/**
 * Delete local snapshot files (.snapshot and .snapshot.checksum) and compressed file from VM
 */
function deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for cleanup');

            const timestamp = backupInfo.timestamp;
            const snapshotPath = backupInfo.snapshotPath;
            const checksumPath = backupInfo.checksumPath;
            const compressedFilename = `qdrantdb_${backupInfo.collectionName}_${backupInfo.snapshotName}_${timestamp}.tar.gz`;
            const compressedPath = `/tmp/${compressedFilename}`;

            // Delete compressed file and the specific snapshot files we created
            const deleteCommand = `
                rm -f ${compressedPath} && \
                rm -f ${snapshotPath} ${checksumPath} && \
                echo "Cleanup completed: Removed ${compressedPath}, ${snapshotPath}, and ${checksumPath}"
            `;

            conn.exec(deleteCommand, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                let output = '';
                let errorOutput = '';

                stream.on('data', (data) => {
                    output += data.toString();
                    console.log('STDOUT:', data.toString());
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.log('STDERR:', data.toString());
                });

                stream.on('close', (code) => {
                    conn.end();

                    if (code === 0) {
                        resolve({ message: 'Local snapshot files and compressed file deleted successfully' });
                    } else {
                        reject(new Error(`Delete command failed with code ${code}: ${errorOutput}`));
                    }
                });
            });
        });

        conn.on('error', (err) => {
            reject(err);
        });

        conn.connect({
            host: vmIp,
            port: 22,
            username: vmUsername,
            privateKey: sshKey,
        });
    });
}
