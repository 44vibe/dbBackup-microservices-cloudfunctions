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

        // 2. Create snapshot and download it via Qdrant API
        console.log('Creating and downloading snapshot via SSH...');
        const backupInfo = await createAndDownloadSnapshot(vmIp, vmUsername, sshKey);
        console.log('Snapshot downloaded successfully:', backupInfo);

        // 3. Upload backup to GCS
        console.log(`Uploading backup to GCS bucket: ${bucketName}`);
        const uploadResult = await uploadBackupToGCS(vmIp, vmUsername, sshKey, backupInfo);
        console.log('Backup uploaded successfully:', uploadResult);

        // 4. Delete local downloaded snapshot and compressed files from VM
        await deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo, uploadResult);
        console.log('Local downloaded snapshot and compressed files deleted from VM');

        // 5. Delete snapshot from Qdrant storage (~/qdrant_snapshots/test_collection/)
        await deleteQdrantSnapshot(vmIp, vmUsername, sshKey, backupInfo.snapshotName);
        console.log('Snapshot deleted from Qdrant storage');

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
 * Create snapshot via Qdrant API and download it using the download endpoint.
 * The download endpoint waits for the snapshot to be ready before returning.
 */
function createAndDownloadSnapshot(vmIp, vmUsername, sshKey) {
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

            // Node.js script to:
            // 1. Create snapshot via POST API
            // 2. Download snapshot via GET API (this waits for snapshot to be ready)
            // 3. Save to local file
            const scriptTimestamp = Date.now();
            const localPath = `/tmp/qdrant_${collectionName}_${timestamp}.snapshot`;
            
            const scriptContent = `
const fs = require('fs');

(async () => {
  const baseUrl = 'http://localhost:6333';
  const collection = '${collectionName}';
  const localPath = '${localPath}';
  
  try {
    // Step 1: Create snapshot
    console.log('Creating snapshot...');
    const createUrl = \`\${baseUrl}/collections/\${collection}/snapshots\`;
    const createResponse = await fetch(createUrl, { method: 'POST' });
    
    if (!createResponse.ok) {
      throw new Error(\`Failed to create snapshot: \${createResponse.status} \${createResponse.statusText}\`);
    }
    
    const createData = await createResponse.json();
    
    if (!createData.result || !createData.result.name) {
      throw new Error('Invalid response: missing snapshot name');
    }
    
    const snapshotName = createData.result.name;
    console.log('Snapshot created: ' + snapshotName);
    
    // Step 2: Download snapshot (this endpoint waits for snapshot to be ready)
    console.log('Downloading snapshot...');
    const downloadUrl = \`\${baseUrl}/collections/\${collection}/snapshots/\${snapshotName}\`;
    const downloadResponse = await fetch(downloadUrl);
    
    if (!downloadResponse.ok) {
      throw new Error(\`Failed to download snapshot: \${downloadResponse.status} \${downloadResponse.statusText}\`);
    }
    
    // Step 3: Save to file
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localPath, buffer);
    
    const stats = fs.statSync(localPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('SNAPSHOT_NAME=' + snapshotName);
    console.log('LOCAL_PATH=' + localPath);
    console.log('FILE_SIZE=' + stats.size);
    console.log('Snapshot downloaded successfully: ' + fileSizeMB + ' MB');
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
})();
            `.trim();

            // Write script to temp file, execute it, then clean up
            const scriptPath = `/tmp/qdrant_backup_${scriptTimestamp}.js`;
            const backupCommand = `
                cat > "${scriptPath}" << 'SCRIPT_EOF'
${scriptContent}
SCRIPT_EOF
                node "${scriptPath}" && \
                rm -f "${scriptPath}"
            `;

            conn.exec(backupCommand, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                let output = '';
                let errorOutput = '';
                let snapshotName = null;
                let downloadedPath = null;
                let fileSize = null;

                stream.on('data', (data) => {
                    const dataStr = data.toString();
                    output += dataStr;
                    console.log('STDOUT:', dataStr);
                    
                    // Extract values from output
                    const nameMatch = dataStr.match(/SNAPSHOT_NAME=([^\s]+)/);
                    if (nameMatch) snapshotName = nameMatch[1];
                    
                    const pathMatch = dataStr.match(/LOCAL_PATH=([^\s]+)/);
                    if (pathMatch) downloadedPath = pathMatch[1];
                    
                    const sizeMatch = dataStr.match(/FILE_SIZE=(\d+)/);
                    if (sizeMatch) fileSize = parseInt(sizeMatch[1]);
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.log('STDERR:', data.toString());
                });

                stream.on('close', (code) => {
                    conn.end();

                    if (code !== 0) {
                        return reject(new Error(`Backup command failed with code ${code}: ${errorOutput}`));
                    }

                    if (!snapshotName || !downloadedPath) {
                        return reject(new Error('Failed to extract snapshot info from output'));
                    }

                    console.log(`Snapshot downloaded: ${snapshotName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

                    resolve({
                        timestamp: timestamp,
                        snapshotName: snapshotName,
                        localPath: downloadedPath,
                        fileSize: fileSize,
                        collectionName: collectionName,
                        message: `QdrantDB snapshot ${snapshotName} downloaded successfully`
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
 * Compress and upload snapshot file from VM to Google Cloud Storage
 */
async function uploadBackupToGCS(vmIp, vmUsername, sshKey, backupInfo) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for compression and upload');

            const compressedFilename = `qdrantdb_${backupInfo.collectionName}_${backupInfo.timestamp}.tar.gz`;
            const compressedPath = `/tmp/${compressedFilename}`;
            const gcsPath = `qdrantdb/${compressedFilename}`;

            // Compress the snapshot file using gzip
            const compressCommand = `gzip -c "${backupInfo.localPath}" > "${compressedPath}" && echo "COMPRESSED_SIZE=$(stat -c%s "${compressedPath}" 2>/dev/null || stat -f%z "${compressedPath}")"`;

            console.log('Compressing snapshot file...');
            conn.exec(compressCommand, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                let compressOutput = '';
                let compressError = '';
                let compressedSize = null;

                stream.on('data', (data) => {
                    const dataStr = data.toString();
                    compressOutput += dataStr;
                    console.log('Compress STDOUT:', dataStr);
                    
                    const sizeMatch = dataStr.match(/COMPRESSED_SIZE=(\d+)/);
                    if (sizeMatch) compressedSize = parseInt(sizeMatch[1]);
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

                    const originalMB = (backupInfo.fileSize / 1024 / 1024).toFixed(2);
                    const compressedMB = compressedSize ? (compressedSize / 1024 / 1024).toFixed(2) : 'unknown';
                    console.log(`Compression complete: ${originalMB} MB → ${compressedMB} MB`);

                    // Upload compressed file to GCS
                    conn.sftp((err, sftp) => {
                        if (err) {
                            conn.end();
                            return reject(err);
                        }

                        const readStream = sftp.createReadStream(compressedPath);
                        const bucket = storage.bucket(bucketName);
                        const file = bucket.file(gcsPath);
                        const writeStream = file.createWriteStream({
                            metadata: {
                                contentType: 'application/gzip',
                                metadata: {
                                    source: 'qdrantdb-backup-function',
                                    timestamp: new Date().toISOString(),
                                    collectionName: backupInfo.collectionName,
                                    snapshotName: backupInfo.snapshotName,
                                    originalSize: backupInfo.fileSize,
                                    compressedSize: compressedSize,
                                    backupMethod: 'snapshot-download-compressed'
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
                            console.log('Compressed snapshot uploaded to GCS successfully');
                            resolve({
                                gcsPath: `gs://${bucketName}/${gcsPath}`,
                                bucket: bucketName,
                                filename: gcsPath,
                                compressedPath: compressedPath,
                                compressedSize: compressedSize
                            });
                        });

                        readStream.pipe(writeStream);
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
 * Delete local snapshot and compressed files from VM after successful upload
 */
function deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo, uploadResult) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for cleanup');

            // Delete both the original snapshot and the compressed file
            const deleteCommand = `rm -f "${backupInfo.localPath}" "${uploadResult.compressedPath}" && echo "Cleanup completed: Removed snapshot and compressed files"`;

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
                        resolve({ message: 'Local snapshot and compressed files deleted successfully' });
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

/**
 * Delete snapshot from Qdrant storage via DELETE API
 * This removes the snapshot files from ~/qdrant_snapshots/{collection}/
 */
function deleteQdrantSnapshot(vmIp, vmUsername, sshKey, snapshotName) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for Qdrant snapshot cleanup');

            // Delete snapshot via Qdrant API
            const deleteCommand = `curl -s -X DELETE "http://localhost:6333/collections/${collectionName}/snapshots/${snapshotName}" && echo "Qdrant snapshot deleted: ${snapshotName}"`;

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
                        resolve({ message: `Qdrant snapshot ${snapshotName} deleted successfully` });
                    } else {
                        // Don't fail the whole backup if snapshot deletion fails
                        console.warn(`Warning: Failed to delete Qdrant snapshot: ${errorOutput}`);
                        resolve({ message: 'Qdrant snapshot deletion skipped', warning: errorOutput });
                    }
                });
            });
        });

        conn.on('error', (err) => {
            // Don't fail the whole backup if snapshot deletion fails
            console.warn('Warning: SSH connection error during Qdrant snapshot cleanup:', err.message);
            resolve({ message: 'Qdrant snapshot deletion skipped', warning: err.message });
        });

        conn.connect({
            host: vmIp,
            port: 22,
            username: vmUsername,
            privateKey: sshKey,
        });
    });
}
