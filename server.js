const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');
const libre = require('libreoffice-convert');
const util = require('util');
const convertAsync = util.promisify(libre.convert);

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Serve static files
app.use('/downloads', express.static('downloads'));
app.use('/processed', express.static('processed'));

// PowerPoint to PDF conversion endpoint
app.post('/convert', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    try {
        const inputPath = req.file.path;
        const outputFileName = `converted-${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, 'downloads', outputFileName);

        const file = await fs.promises.readFile(inputPath);
        const pdfBuffer = await convertAsync(file, '.pdf', undefined);
        await fs.promises.writeFile(outputPath, pdfBuffer);

        // Cleanup input file
        fs.unlink(inputPath, err => {
            if (err) console.error('Error cleaning up:', err);
        });

        res.json({
            success: true,
            downloadUrl: `/downloads/${outputFileName}`,
            message: 'File converted successfully'
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Failed to convert file: ' + error.message });
    }
});

// Keep existing video processing endpoints...
// ... (keep remove-audio and merge endpoints from your current server.js)

// Create required directories
['uploads', 'downloads', 'processed'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 