const CONCURRENCY = 8;
const jobs = [];
let active = 0;

function pump() {
  while (active < CONCURRENCY && jobs.length) {
    const job = jobs.shift();
    active++;
    job().finally(() => {
      active--;
      pump();
    });
  }
}

export function enqueue(fn) {
  return new Promise((resolve, reject) => {
    jobs.push(() => Promise.resolve().then(fn).then(resolve, reject));
    pump();
  });
}

const textures = new Map();
const models = new Map();
const inflight = new Map();

export function assetUrl(path) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${String(path).replace(/^\//, "")}`;
}

export function loadTexture(THREE, url) {
  if (textures.has(url)) return Promise.resolve(textures.get(url));
  if (inflight.has(url)) return inflight.get(url);
  const p = enqueue(
    () =>
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 1;
            textures.set(url, tex);
            resolve(tex);
          },
          undefined,
          reject,
        );
      }),
  );
  inflight.set(url, p);
  return p.finally(() => inflight.delete(url));
}

export async function loadGlb(THREE, GLTFLoader, DRACOLoader, url) {
  if (models.has(url)) return models.get(url);
  if (inflight.has(url)) return inflight.get(url);
  const p = enqueue(async () => {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    draco.setDecoderConfig({ type: "js" });
    loader.setDRACOLoader(draco);
    const gltf = await loader.loadAsync(url);
    models.set(url, gltf);
    return gltf;
  });
  inflight.set(url, p);
  return p.finally(() => inflight.delete(url));
}

export function preloadPortraits(THREE, cast) {
  return Promise.all(cast.map((c) => loadTexture(THREE, assetUrl(c.webp || c.png)).catch(() => null)));
}

export async function loadFavouriteModel(THREE, loaders, cast, favourite) {
  const member = cast[favourite - 1];
  if (!member) return null;
  try {
    return await loadGlb(THREE, loaders.GLTFLoader, loaders.DRACOLoader, assetUrl(member.glb));
  } catch {
    return null;
  }
}

export function lazyRestModels(THREE, loaders, cast, favourite) {
  const rest = cast.filter((c) => c.tier !== favourite);
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  idle(() => {
    rest.forEach((c) => {
      loadGlb(THREE, loaders.GLTFLoader, loaders.DRACOLoader, assetUrl(c.glb)).catch(() => {});
    });
  });
}
