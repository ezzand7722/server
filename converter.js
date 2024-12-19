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
    ? 'http://localhost:1000/convert'
    : 'https://your-hosted-domain.com/convert';  // Replace with your actual hosted domain

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
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Conversion failed');
        }

        // Update download URL construction
        const serverBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:1000'
            : 'https://your-hosted-domain.com';  // Replace with your actual hosted domain
            
        const downloadUrl = `${serverBaseUrl}${result.downloadUrl}`;
        
        // Download the converted file
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = file.name.replace(/\.(ppt|pptx)$/, '.pdf');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        progress.style.width = '100%';
        showSuccess('Conversion completed! File downloaded.');

    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || 'Error converting file');
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
