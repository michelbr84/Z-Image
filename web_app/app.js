const generateBtn = document.getElementById('generateBtn');
const promptInput = document.getElementById('promptInput');
const imageContainer = document.getElementById('imageContainer');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.getElementById('btnLoader');
const timeTakenEl = document.getElementById('timeTaken');

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
                steps: 8
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
