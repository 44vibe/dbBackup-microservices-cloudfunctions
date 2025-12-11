const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Storage } = require('@google-cloud/storage');
const { Client } = require('ssh2');

const secretClient = new SecretManagerServiceClient();
const storage = new Storage();
const projectId = 'gcf-course-478410';
const bucketName = 'postgresql-server-backups';

/**
 * Cloud Function triggered by Pub/Sub for QuestDB backup
 */
exports.questdbBackupHandler = async (message, context) => {
    console.log('QuestDB backup triggered!');
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

        // 4. Delete local compressed file and backup data from VM
        await deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo);
        console.log('Local compressed file and backup data deleted from VM');

    return {
        success: true,
        message: 'QuestDB backup completed and uploaded to GCS',
        gcsPath: uploadResult.gcsPath
    };

    } catch (error) {
        console.error('Backup failed:', error);
        throw error;
    }
};

/**
 * Execute QuestDB backup via SSH using checkpoint method
 */
function executeBackup(vmIp, vmUsername, sshKey) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = `/tmp/questdb_backups`;

            // QuestDB checkpoint backup command
            // 1. Create backup directory if it doesn't exist (only once)
            // 2. Trigger checkpoint to backup directory
            const backupCommand = `
                mkdir -p ${backupDir} && \
                curl -G "http://localhost:9000/exec" --data-urlencode "query=BACKUP DATABASE TO '${backupDir}';" && \
                echo "Backup completed to: ${backupDir}"
            `;

            conn.exec(backupCommand, (err, stream) => {
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
                        resolve({
                            timestamp: timestamp,
                            backupDir: backupDir,
                            message: output.trim() || 'QuestDB backup checkpoint completed successfully'
                        });
                    } else {
                        reject(new Error(`Backup command failed with code ${code}: ${errorOutput}`));
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
 * Upload backup directory from VM to Google Cloud Storage
 * Compresses the backup directory using tar -czf before upload
 */
async function uploadBackupToGCS(vmIp, vmUsername, sshKey, backupInfo) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for compression and upload');

            const timestamp = backupInfo.timestamp;
            const compressedFilename = `questdb_backup_${timestamp}.tar.gz`;
            const compressedPath = `/tmp/${compressedFilename}`;

            // Compress the backup directory using tar -czf
            const compressCommand = `tar -czf ${compressedPath} -C /tmp questdb_backups`;

            console.log('Compressing backup directory...');
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

                    console.log('Backup compressed successfully, uploading to GCS...');

                    // Upload compressed file to GCS
                    conn.sftp((err, sftp) => {
                        if (err) {
                            conn.end();
                            return reject(err);
                        }

                        const readStream = sftp.createReadStream(compressedPath);
                        const bucket = storage.bucket(bucketName);
                        const gcsPath = `questdb-backup/${compressedFilename}`;
                        const file = bucket.file(gcsPath);
                        const writeStream = file.createWriteStream({
                            metadata: {
                                contentType: 'application/gzip',
                                metadata: {
                                    source: 'questdb-backup-function',
                                    timestamp: new Date().toISOString(),
                                    backupMethod: 'checkpoint'
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
                        console.log('Compressed backup uploaded to GCS successfully');
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
 * Delete local compressed file and backup data from VM after successful upload
 * Keeps the backup directory structure for future backups
 */
function deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH connection established for cleanup');

            const timestamp = backupInfo.timestamp;
            const backupDir = backupInfo.backupDir;
            const compressedFilename = `questdb_backup_${timestamp}.tar.gz`;
            const compressedPath = `/tmp/${compressedFilename}`;

            // Delete compressed file and clean backup directory contents, but keep the directory
            const deleteCommand = `rm -f ${compressedPath} && rm -rf ${backupDir}/* && echo "Cleanup completed"`;

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
                        resolve({ message: 'Local compressed file and backup data deleted successfully' });
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

