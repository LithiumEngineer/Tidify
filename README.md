# Tidify

Finds duplicate photos on your computer. Pick a folder to scan everything and group similar images together so you can clean up duplicated photos. 

## How it works

Each photo is passed through a CNN (MobileNetV3) running locally on your machine to extract a high-dimensional embedding - a vector that represents the visual content of the image. These embedding vectors are L2-normalized and stored in a FAISS index, and cosine similarity is used to compute the similarity score between images. Images scoring above a threshold are grouped as duplicates via Union-Find. 

Within each group, images are ranked by resolution, sharpness, and file size to surface the best one.

## Run it

```bash
# install
npm install
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ..

# run
./runAll.sh
```

The ML model (~10 MB) downloads on first scan.

## Tech stack

Electron, React, TypeScript, Tailwind, shadcn/ui, Python, FastAPI, ONNX Runtime, MobileNetV3, FAISS, OpenCV, Pillow, Send2Trash.
