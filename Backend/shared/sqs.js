const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

function createSqsClient() {
  return new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_SQS_ENDPOINT || 'http://localhost:4566',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
    forcePathStyle: true,
  });
}

function getQueueUrl(queueName) {
  if (process.env.AWS_SQS_ENDPOINT) {
    const endpoint = process.env.AWS_SQS_ENDPOINT;
    return `${endpoint}/queue/${queueName}`;
  }
  return `http://localhost:4566/queue/${queueName}`;
}

async function sendMessage(sqs, queueName, body) {
  const cmd = new SendMessageCommand({
    QueueUrl: getQueueUrl(queueName),
    MessageBody: JSON.stringify(body),
  });
  return sqs.send(cmd);
}

module.exports = { createSqsClient, getQueueUrl, sendMessage, SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand };
