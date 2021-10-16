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
    //`https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    `https://drive.google.com/file/d/1tmSDQMNgm-ElN47IxCJSGN3knzmRDamY/view?usp=sharing`,
    pipeline
);
const containerClient = blobServiceClient.getContainerClient(process.env.CONTAINER_NAME1);

app.get('/upload', (req, res) => {
    res.render('uploader');
});

app.post('/upload', async (req, res) => {
    req.pipe(req.busboy);
    var fstream;
    req.busboy.on('file', async function (fieldname, file, filename) {
        console.log(filename);
        var filePath = __dirname + '\\files\\' + filename;
        fstream = fs.createWriteStream(filePath);
        file.pipe(fstream);
        fstream.on('close', async () => {
            const blobName = filename + new Date().getTime();
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            try {
                await blockBlobClient.uploadStream(fs.createReadStream(filePath), 4 * 1024 * 1024, 20, {
                    onProgress: (e) => console.log(e)
                });
                res.redirect("/result/"+encodeURIComponent(blockBlobClient.url));
            } catch (err) {
                res.send("Error occurred " + err.statusCode);
            }
        });        
    });
    
});

app.get("/result/:url", (req, res) => {
    res.render('result', {src: req.params.url});
});

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(8000);