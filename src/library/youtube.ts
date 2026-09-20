export function getYouTubeVideoId(videoUrl?: string) {
  if (!videoUrl) return undefined;

  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v") ?? undefined;
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);
      return match?.[1];
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function getYouTubeThumbnails(videoUrl?: string) {
  const id = getYouTubeVideoId(videoUrl);
  if (!id) return undefined;

  const base = `https://img.youtube.com/vi/${id}`;
  return {
    primary: `${base}/maxresdefault.jpg`,
    fallback: `${base}/hqdefault.jpg`,
  };
}

export function shouldUseYouTubeThumbnail(imageUrl?: string) {
  if (!imageUrl) return true;

  try {
    const filename = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() ?? "");
    return /^videoframe[_-]/i.test(filename);
  } catch {
    return false;
  }
}
