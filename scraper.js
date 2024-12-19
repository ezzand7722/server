// Get DOM elements
const urlInput = document.getElementById('urlInput');
const fileInput = document.getElementById('fileInput');
const scrapeButton = document.getElementById('scrapeButton');
const resultContainer = document.getElementById('resultContainer');
const loadingSpinner = document.getElementById('loadingSpinner');

// Add file input change listener
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (!file.name.match(/\.(ppt|pptx)$/)) {
            showError('Invalid file type. Please select a PowerPoint file (.ppt or .pptx)');
            fileInput.value = '';
            return;
        }
        const label = document.querySelector('.file-input-label');
        label.innerHTML = `<i class="fas fa-file-powerpoint"></i> ${file.name}`;
        label.style.color = '#a855f7';
    }
});

// Handle automation and conversion
scrapeButton.addEventListener('click', async function() {
    const url = urlInput.value.trim();
    const file = fileInput.files[0];
    
    resultContainer.innerHTML = '';
    
    if (!file || !url) {
        showError('Please select both a file and enter a URL');
        return;
    }

    try {
        loadingSpinner.style.display = 'block';
        resultContainer.innerHTML = '<p class="processing-message">Processing your request...</p>';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('url', url);

        const response = await fetch('http://localhost:3001/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Conversion failed');
        }

        const result = await response.json();

        resultContainer.innerHTML = `
            <div class="result-section">
                <h2>Process Complete! <i class="fas fa-check-circle" style="color: #10b981;"></i></h2>
                <div class="download-section">
                    <a href="${result.downloadUrl}" class="download-button" download>
                        <i class="fas fa-download"></i> Download Converted File
                    </a>
                </div>
            </div>
        `;

    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

function showError(message) {
    resultContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i> ${message}
        </div>
    `;
} 