const generateBtn = document.getElementById('generateBtn');
const promptInput = document.getElementById('promptInput');
const imageContainer = document.getElementById('imageContainer');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.getElementById('btnLoader');
const timeTakenEl = document.getElementById('timeTaken');

// Upload Elements
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const clearImageBtn = document.getElementById('clearImageBtn');
const settingsSection = document.getElementById('settingsSection');
const strengthSlider = document.getElementById('strengthSlider');
const strengthValue = document.getElementById('strengthValue');

let uploadedImageBase64 = null;

// Upload Handlers
uploadBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result;
            imagePreview.src = uploadedImageBase64;
            imagePreviewContainer.style.display = 'inline-block';
            settingsSection.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
});

clearImageBtn.addEventListener('click', () => {
    imageInput.value = '';
    uploadedImageBase64 = null;
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    settingsSection.style.display = 'none';
});

strengthSlider.addEventListener('input', (e) => {
    strengthValue.textContent = e.target.value;
});

generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // UI Loading State
    setLoading(true);
    timeTakenEl.textContent = '';
    imageContainer.innerHTML = ''; // Clear previous

    const startTime = Date.now();

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                height: 1024,
                width: 1024,
                steps: 8,
                image: uploadedImageBase64,
                strength: parseFloat(strengthSlider.value)
            }),
        });

        const data = await response.json();

        if (response.ok) {
            const img = new Image();
            img.src = data.image;
            img.onload = () => {
                imageContainer.appendChild(img);
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                timeTakenEl.textContent = `Generated in ${duration}s`;
            };
        } else {
            console.error('Error:', data.detail);
            imageContainer.innerHTML = `<div class="placeholder-text" style="color: #ff6b6b">Error: ${data.detail}</div>`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        imageContainer.innerHTML = `<div class="placeholder-text" style="color: #ff6b6b">Connection Error</div>`;
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}
