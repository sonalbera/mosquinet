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
const https = require('https');
const detection = "https://detectmosqui.azurewebsites.net/api/detect?code=XqNq8yXbgigEHmKcmyLiTJjdv/QpRE/H9fryacmkzmucgod4XRGRDg==&url=";
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
                let data = '';
                const detectReq = https.request(detection + encodeURIComponent(blockBlobClient.url), detectRes => {
                    detectRes.on('data', d => {
                        data += d;
                    });

                    detectRes.on('end', () => {
                        console.log(data);
                    })
                });
                detectReq.on('error', err => {
                    console.log(err);
                })
                detectReq.end();
                res.redirect("/result/"+encodeURIComponent(blockBlobClient.url));
            } catch (err) {
                res.send("Error occurred " + err.statusCode);
            }
        });        
    });
   /* res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.redirect("/result/" + encodeURIComponent(`https://drive.google.com/file/d/1tmSDQMNgm-ElN47IxCJSGN3knzmRDamY/preview`));
    */
});

app.get("/result/:url", (req, res) => {
    res.render('result', {src: req.params.url});
});

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(process.env.PORT||8000);