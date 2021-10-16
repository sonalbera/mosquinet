const {
    BlobServiceClient,
    StorageSharedKeyCredential,
    newPipeline
} = require('@azure/storage-blob');
require('dotenv').config();
var express = require('express');
var busboy = require('connect-busboy');
var app = express();
var fs = require('fs');
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(busboy());

const sharedKeyCredential = new StorageSharedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT_NAME,
    process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);
const pipeline = newPipeline(sharedKeyCredential);

const blobServiceClient = new BlobServiceClient(
    `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    pipeline
);
const containerClient = blobServiceClient.getContainerClient(process.env.CONTAINER_NAME1);

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/upload', (req, res) => {
    res.render('uploader');
});

app.post('/upload', async (req, res) => {
    req.pipe(req.busboy);
    var fstream;
    req.busboy.on('file', async function (fieldname, file, filename) {
        console.log(filename);
        var filePath = __dirname + '\\files\\' + filename;
        console.log(filePath);
        fstream = fs.createWriteStream(filePath);
        file.pipe(fstream);
        fstream.on('close', async () => {
            const blobName = filename + new Date().getTime();
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            try {
                await blockBlobClient.uploadStream(fs.createReadStream(filePath), 4 * 1024 * 1024, 20, {
                    onProgress: (e) => console.log(e)
                });
                res.send("File uploaded to azure!");
            } catch (err) {
                res.send("Error occurred " + err.statusCode);
            }
        });        
    });
    
});

app.listen(8000);