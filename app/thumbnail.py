"""
Station of Vision – Thumbnail Generator
Uses OpenCV to extract a frame from video files and save as JPEG thumbnails.
"""

import hashlib
import os

import cv2
from pathlib import Path

THUMBNAILS_DIR = Path(__file__).parent.parent / "thumbnails"

# Thumbnail dimensions (16:9)
THUMB_WIDTH = 320
THUMB_HEIGHT = 180


def _get_thumb_path(video_path: str) -> Path:
    """Generate a deterministic thumbnail filename from the video path."""
    path_hash = hashlib.md5(video_path.encode("utf-8")).hexdigest()
    return THUMBNAILS_DIR / f"{path_hash}.jpg"


def generate_thumbnail(video_path: str, quality: int = 85) -> str | None:
    """
    Generate a JPEG thumbnail from a video file.
    Returns the thumbnail file path, or None on failure.
    Uses a cached version if it already exists.
    """
    THUMBNAILS_DIR.mkdir(exist_ok=True)
    thumb_path = _get_thumb_path(video_path)

    # Return cached thumbnail
    if thumb_path.exists():
        return str(thumb_path)

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        # Try to grab a frame at ~2 seconds to avoid black intro frames
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        target_frame = min(int(fps * 2), max(int(total_frames) - 1, 0))

        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()

        # Fallback to first frame
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()

        cap.release()

        if not ret or frame is None:
            return None

        # Resize to thumbnail dimensions
        frame = cv2.resize(frame, (THUMB_WIDTH, THUMB_HEIGHT), interpolation=cv2.INTER_AREA)

        # Save as JPEG
        cv2.imwrite(str(thumb_path), frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return str(thumb_path)

    except Exception as e:
        print(f"[Thumbnail] Failed for {video_path}: {e}")
        return None


def has_thumbnail(video_path: str) -> bool:
    """Check if a thumbnail already exists for the given video."""
    return _get_thumb_path(video_path).exists()
