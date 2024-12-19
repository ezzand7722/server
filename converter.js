// Get DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const convertButton = document.getElementById('convertButton');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const statusMessage = document.getElementById('statusMessage');

// Server configuration
const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:10000/convert'
    : 'https://server-pv39.onrender.com/convert';

// Handle file drop and click to upload
fileInput.addEventListener('change', function(e) {
    handleFiles(this.files);
});

dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('drag-active');
    handleFiles(e.dataTransfer.files);
});

dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.classList.remove('drag-active');
});

// Show file info
function handleFiles(files) {
    const file = files[0];
    if (file && file.name.match(/\.(ppt|pptx)$/)) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        convertButton.disabled = false;
    } else {
        showError('Invalid file type. Please select a .ppt or .pptx file.');
        convertButton.disabled = true;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show error message
function showError(message) {
    statusMessage.className = 'status-message error';
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
}

// Show success message
function showSuccess(message) {
    statusMessage.className = 'status-message success';
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
}

// Handle file conversion
convertButton.addEventListener('click', async function() {
    const file = fileInput.files[0];
    if (!file) return;

    progressBar.style.display = 'block';
    convertButton.disabled = true;
    progress.style.width = '50%';

    const formData = new FormData();
    formData.append('file', file);

    try {
        console.log('Starting conversion request for:', file.name);
        console.log('Server URL:', SERVER_URL);
        
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Accept': 'application/json',
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new Error('Invalid server response format');
        }

        if (!result.success) {
            throw new Error(result.error || result.details || 'Conversion failed');
        }

        const serverBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:10000'
            : 'https://server-pv39.onrender.com';

        const downloadUrl = `${serverBaseUrl}${result.downloadUrl}`;
        console.log('Download URL:', downloadUrl);

        // Test download URL accessibility
        try {
            const testResponse = await fetch(downloadUrl, { method: 'HEAD' });
            if (!testResponse.ok) {
                throw new Error('Generated file is not accessible');
            }
        } catch (e) {
            console.error('Download URL test failed:', e);
            throw new Error('Cannot access converted file');
        }

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = file.name.replace(/\.(ppt|pptx)$/, '.pdf');
        
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.open(downloadUrl, '_blank');
        } else {
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        progress.style.width = '100%';
        showSuccess('Conversion completed! File downloaded.');

    } catch (error) {
        console.error('Detailed conversion error:', error);
        showError(`Error: ${error.message}`);
    } finally {
        setTimeout(() => {
            progressBar.style.display = 'none';
            progress.style.width = '0%';
            convertButton.disabled = false;
            fileInfo.style.display = 'none';
            fileInput.value = '';
        }, 3000);
    }
}); 
