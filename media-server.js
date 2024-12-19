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
app.use(cors({
    origin: [
        'http://localhost:10000',
        'http://127.0.0.1:10000',
        'https://your-github-pages-domain.com',
        'https://your-hosted-domain.com'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    credentials: false
}));

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp/')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const upload = multer({ storage: storage });

// Serve processed files
app.use('/processed', express.static('processed'));

// Remove audio endpoint
app.post('/remove-audio', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    const inputPath = req.file.path;
    const outputFileName = `no-audio-${Date.now()}.webm`;
    const outputPath = path.join(__dirname, 'processed', outputFileName);

    ffmpeg(inputPath)
        .videoCodec('libvpx')
        .videoBitrate('2500k')
        .outputOptions(['-an']) // Remove audio
        .format('webm')
        .on('end', () => {
            // Cleanup input file
            fs.unlink(inputPath, (err) => {
                if (err) console.error('Error cleaning up:', err);
            });
            
            res.json({
                success: true,
                downloadUrl: `/processed/${outputFileName}`
            });
        })
        .on('error', (err) => {
            console.error('Error:', err);
            res.status(500).json({ error: 'Failed to process video' });
        })
        .save(outputPath);
});

// Merge audio and video endpoint
app.post('/merge', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    if (!req.files.audio || !req.files.video) {
        return res.status(400).json({ error: 'Both audio and video files are required' });
    }

    const audioPath = req.files.audio[0].path;
    const videoPath = req.files.video[0].path;
    const outputFileName = `merged-${Date.now()}.webm`;
    const outputPath = path.join(__dirname, 'processed', outputFileName);

    ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .videoCodec('libvpx')
        .videoBitrate('2500k')
        .audioCodec('libvorbis')
        .format('webm')
        .on('end', () => {
            // Cleanup input files
            fs.unlink(audioPath, err => {
                if (err) console.error('Error cleaning up audio:', err);
            });
            fs.unlink(videoPath, err => {
                if (err) console.error('Error cleaning up video:', err);
            });

            res.json({
                success: true,
                downloadUrl: `/processed/${outputFileName}`
            });
        })
        .on('error', (err) => {
            console.error('Error:', err);
            res.status(500).json({ error: 'Failed to merge files' });
        })
        .save(outputPath);
});

// Update conversion endpoint
app.post('/convert', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    const inputPath = req.file.path;
    const outputFileName = `converted-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, 'processed', outputFileName);

    try {
        // Read the file
        const file = await fs.promises.readFile(inputPath);
        
        // Convert to PDF
        const pdfBuffer = await convertAsync(file, '.pdf', undefined);
        
        // Write the converted file
        await fs.promises.writeFile(outputPath, pdfBuffer);

        // Cleanup input file
        fs.unlink(inputPath, err => {
            if (err) console.error('Error cleaning up:', err);
        });

        res.json({
            success: true,
            downloadUrl: `/processed/${outputFileName}`,
            message: 'File converted successfully'
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Failed to convert file: ' + error.message });
    }
});

// Create required directories
['temp', 'processed', 'uploads'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

// Cleanup old files periodically (24 hours)
setInterval(() => {
    ['temp', 'processed'].forEach(dir => {
        fs.readdir(dir, (err, files) => {
            if (err) return;
            files.forEach(file => {
                const filePath = path.join(dir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    const now = new Date().getTime();
                    const endTime = new Date(stats.ctime).getTime() + 24 * 60 * 60 * 1000;
                    if (now > endTime) {
                        fs.unlink(filePath, err => {
                            if (err) console.error(`Error deleting ${filePath}:`, err);
                        });
                    }
                });
            });
        });
    });
}, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT || 10000;  // Update port to 10000
app.listen(PORT, '0.0.0.0', () => {  // Listen on all network interfaces
    console.log(`Media processing server running on port ${PORT}`);
}); 
