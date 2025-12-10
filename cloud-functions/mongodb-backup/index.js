const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Storage } = require('@google-cloud/storage');
const { Client } = require('ssh2');

const secretClient = new SecretManagerServiceClient();
const storage = new Storage();
const projectId = process.env.GCP_PROJECT_ID || 'gcf-course-478410';
const bucketName = process.env.GCS_BACKUP_BUCKET || 'postgresql-server-backups';

/**
 * Cloud Function triggered by Pub/Sub for MongoDB backup
 */
exports.mongodbBackupHandler = async (message, context) => {
  console.log('MongoDB backup triggered!');
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
    const backupInfo = await executeBackup(vmIp, vmUsername, sshKey);
    console.log('Backup created successfully:', backupInfo);

    // 3. Upload backup to GCS
    console.log(`Uploading backup to GCS bucket: ${bucketName}`);
    const uploadResult = await uploadBackupToGCS(vmIp, vmUsername, sshKey, backupInfo.filename);
    console.log('Backup uploaded successfully:', uploadResult);

    // 4. Delete local backup file from VM
    await deleteLocalBackup(vmIp, vmUsername, sshKey, backupInfo.filename);
    console.log('Local backup file deleted from VM');

    return {
      success: true,
      message: 'MongoDB backup completed and uploaded to GCS',
      gcsPath: uploadResult.gcsPath
    };
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
};

/**
 * Execute MongoDB backup via SSH
 */
function executeBackup(vmIp, vmUsername, sshKey) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('SSH connection established');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mongodb_backup_${timestamp}.tar.gz`;
      const backupCommand = `
        mongodump --out=/tmp/mongodb_backup_${timestamp} && \
        tar -czf /tmp/${filename} -C /tmp mongodb_backup_${timestamp} && \
        rm -rf /tmp/mongodb_backup_${timestamp} && \
        echo "Backup created: /tmp/${filename}"
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
              filename: filename,
              path: `/tmp/${filename}`,
              message: output.trim() || 'Backup completed successfully'
            });
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
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
 * Upload backup file from VM to Google Cloud Storage
 */
async function uploadBackupToGCS(vmIp, vmUsername, sshKey, filename) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('SSH connection established for upload');

      const remotePath = `/tmp/${filename}`;

      // Stream the file from VM
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        const readStream = sftp.createReadStream(remotePath);
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`mongodb/${filename}`);
        const writeStream = file.createWriteStream({
          metadata: {
            contentType: 'application/gzip',
            metadata: {
              source: 'mongodb-backup-function',
              timestamp: new Date().toISOString()
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
            gcsPath: `gs://${bucketName}/mongodb/${filename}`,
            bucket: bucketName,
            filename: `mongodb/${filename}`
          });
        });

        readStream.pipe(writeStream);
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
 * Delete local backup file from VM after successful upload
 */
function deleteLocalBackup(vmIp, vmUsername, sshKey, filename) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('SSH connection established for cleanup');

      const deleteCommand = `rm -f /tmp/${filename}`;

      conn.exec(deleteCommand, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let errorOutput = '';

        stream.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.log('STDERR:', data.toString());
        });

        stream.on('close', (code) => {
          conn.end();

          if (code === 0) {
            resolve({ message: 'Local backup deleted successfully' });
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