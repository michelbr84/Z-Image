
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch
import warnings
from utils import AttentionBackend, ensure_model_weights, load_from_local_dir, set_attention_backend
from zimage import generate
import base64
from io import BytesIO
from PIL import Image
from typing import Optional

# Filter warnings
warnings.filterwarnings("ignore")

app = FastAPI()

# Global variables for model
model_components = None
device = "cuda" if torch.cuda.is_available() else "cpu"

class GenerateRequest(BaseModel):
    prompt: str
    height: int = 1024
    width: int = 1024
    steps: int = 8
    guidance_scale: float = 0.0
    seed: int = 42
    image: Optional[str] = None
    strength: float = 0.8

@app.on_event("startup")
async def startup_event():
    global model_components
    print("Initializing Z-Image model...")
    
    # Ensure weights are present (re-using logic from inference.py)
    # This might take a while if not fully downloaded yet
    model_path = ensure_model_weights("ckpts/Z-Image-Turbo", verify=False)
    
    dtype = torch.bfloat16
    compile_model = False # Set to True for production speedup if desired
    attn_backend = os.environ.get("ZIMAGE_ATTENTION", "native")
    
    print(f"Loading model on {device} with {attn_backend} backend...")
    
    try:
        model_components = load_from_local_dir(
            model_path, 
            device=device, 
            dtype=dtype, 
            compile=compile_model
        )
        
        # Set attention backend
        set_attention_backend(attn_backend)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        # We don't exit here to allow the server to start, 
        # but generation will fail if model isn't loaded
        pass

@app.post("/api/generate")
async def generate_image(request: GenerateRequest):
    global model_components
    
    if model_components is None:
        raise HTTPException(status_code=503, detail="Model is not loaded or still initializing.")
    
    try:
        print(f"Generating image for prompt: {request.prompt}")
        
        input_image = None
        if request.image:
            try:
                # Remove header if present (e.g. "data:image/png;base64,")
                img_data = request.image
                if "," in img_data:
                    img_data = img_data.split(",")[1]
                input_image = Image.open(BytesIO(base64.b64decode(img_data)))
            except Exception as e:
                print(f"Error decoding image: {e}")
                # Fallback to text-to-image or raise error? Failing is better
                raise HTTPException(status_code=400, detail="Invalid image data")

        # Run generation in a separate thread to avoid blocking the event loop
        from fastapi.concurrency import run_in_threadpool
        
        print("Starting generation in threadpool...")
        images = await run_in_threadpool(
            generate,
            transformer=model_components["transformer"],
            vae=model_components["vae"],
            text_encoder=model_components["text_encoder"],
            tokenizer=model_components["tokenizer"],
            scheduler=model_components["scheduler"],
            prompt=request.prompt,
            height=request.height,
            width=request.width,
            num_inference_steps=request.steps,
            guidance_scale=request.guidance_scale,
            generator=torch.Generator(device).manual_seed(request.seed),
            image=input_image,
            strength=request.strength,
        )
        print("Generation completed successfully.")
        
        # Convert to base64
        buffered = BytesIO()
        images[0].save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return {"image": f"data:image/png;base64,{img_str}"}
        
    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve static files for the frontend
# We will create a 'web_app' directory
if not os.path.exists("web_app"):
    os.makedirs("web_app")

app.mount("/", StaticFiles(directory="web_app", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
