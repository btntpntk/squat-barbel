import cv2

INTEL_KEYWORDS = ("intel", "realsense", "depth")



def find_camo_index(keyword="Camo"):
    """Return the first non-Intel camera index whose name contains keyword (or any non-Intel if keyword not found)."""
    try:
        from pygrabber.dshow_graph import FilterGraph
        devices = FilterGraph().get_input_devices()
        print("Detected DirectShow devices:")
        for i, name in enumerate(devices):
            is_intel = any(k in name.lower() for k in INTEL_KEYWORDS)
            tag = "  (Intel/RealSense — skipped)" if is_intel else ""
            print(f"  [{i}] {name}{tag}")

        # First pass: match keyword, skip Intel devices
        for i, name in enumerate(devices):
            if any(k in name.lower() for k in INTEL_KEYWORDS):
                continue
            if keyword.lower() in name.lower():
                return i, name

        # Second pass: any non-Intel device
        for i, name in enumerate(devices):
            if any(k in name.lower() for k in INTEL_KEYWORDS):
                continue
            print(f"No '{keyword}' match found — falling back to first non-Intel device: '{name}'")
            return i, name

        return None, None
    except ImportError:
        return None, None


def scan_indices(limit=10):
    found = []
    for i in range(limit):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if cap.isOpened():
            found.append(i)
            cap.release()
    return found


def test_side_camera(keyword="Camo"):
    print("Enumerating DirectShow camera devices...")
    index, name = find_camo_index(keyword)

    if index is None:
        print(f"Could not find a camera matching '{keyword}' via pygrabber.")
        print("pygrabber may not be installed — scanning indices 0-9 as fallback...")
        available = scan_indices()
        if available:
            print(f"Active cameras at indices: {available}")
            print("Install pygrabber (`pip install pygrabber`) to enable name-based detection.")
        else:
            print("No cameras found at all. Check USB connections and Camo Studio.")
        return

    print(f"Found '{name}' at index {index}. Opening...")
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)

    if not cap.isOpened():
        print(f"[Error] Failed to open '{name}' (index {index}).")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[Success] '{name}' opened at {width}x{height}. Press 'q' to exit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break
        cv2.imshow("Side Camera Test", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    # Ensure Camo Studio is running before executing this
    test_side_camera(keyword="Camo")
