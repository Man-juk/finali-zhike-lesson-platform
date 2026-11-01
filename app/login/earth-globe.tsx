'use client';

import { useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

/**
 * 真实地球
 *
 * 基于 react-globe.gl（封装 three-globe + three）渲染：
 *   · 卫星贴图：earth-blue-marble（深蓝海洋 + 绿色大陆）
 *   · 地形凹凸：earth-topology（bump map，让山脉有立体感）
 *   · 云层：独立球壳，贴 clouds.png，缓慢自转
 *
 * 不开大气光晕（showAtmosphere=false），保持边缘干净。
 *
 * 交互：
 *   · 拖拽旋转 —— globe.gl 内部用 OrbitControls，自带阻尼惯性
 *   · 空闲自转 —— controls.autoRotate，松手后自动接管
 *
 * 贴图全部走 CDN 自动拉取，无需本地下载。
 */

/** 卫星贴图：深蓝海洋 + 绿色大陆 */
const EARTH_IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg';
/** 地形凹凸贴图 */
const BUMPS_IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';
/** 云层贴图 */
const CLOUDS_IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/clouds/clouds.png';

/** 云层相对球面的抬升高度（比例） */
const CLOUDS_ALT = 0.006;
/** 云层每帧自转角度（度） */
const CLOUDS_ROT_SPEED = -0.006;

export interface EarthGlobeProps {
  /** 画布边长（像素） */
  size?: number;
}

export default function EarthGlobe({ size = 460 }: EarthGlobeProps) {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const scene = globe.scene();
    const camera = globe.camera();
    const renderer = globe.renderer();
    const controls = globe.controls();

    // ---- 灯光 ----
    // globe.gl 默认塞的是为「旧版光照模型」调的强度
    // （AmbientLight(0xcccccc, π) + DirectionalLight(0xffffff, 0.6π)），
    // 在 three r155+ 的物理光照下会严重过曝成一片白。
    // 这里用 globe.lights() 整体替换成新版模型下的合理强度：
    // 环境光抬高让深海暗部通透，平行光保证大陆轮廓清晰。
    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(-3, 1, 4);
    globe.lights([
      new THREE.AmbientLight(0xffffff, 1.35),
      sun,
    ]);

    // ---- 云层：略大于球面的透明球壳，独立自转 ----
    // clouds.png 是「调色板 + tRNS」PNG：RGB 恒为白，透明度只存在于
    // alpha 通道里。直接当 map 用时 three 的纹理上传不一定带上这段
    // alpha，结果是一颗不透明白球把整个地球盖住。
    // 这里先把它画到 2D canvas 上，取出 alpha 通道转成灰度图，
    // 再交给 alphaMap（three 的 alphaMap 取灰度图的绿通道）。
    const radius = globe.getGlobeRadius();
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * (1 + CLOUDS_ALT), 72, 72),
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    );
    clouds.visible = false;

    let disposed = false;
    new THREE.TextureLoader().load(CLOUDS_IMG, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      const alphaMap = buildAlphaMap(texture.image as HTMLImageElement);
      texture.dispose();
      if (!alphaMap) return;

      const mat = clouds.material as THREE.MeshPhongMaterial;
      mat.alphaMap = alphaMap;
      mat.needsUpdate = true;
      clouds.visible = true;
      scene.add(clouds);
    });

    // ---- 相机：拉近让地球在右栏里更大 ----
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, radius * 2.4);
    cam.lookAt(0, 0, 0);

    // ---- 渲染：不做色调映射，颜色直接按 sRGB 输出，最通透鲜艳 ----
    // ACES Filmic 会压掉高光、让整颗球偏灰偏暗；这里关掉它，
    // 改由灯光强度本身控制明暗，避免二次压暗。
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0xffffff, 0);

    // ---- 控制器：拖拽 + 阻尼惯性 + 空闲自转 ----
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = radius * 1.85;
    controls.maxDistance = radius * 4.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.update();

    // ---- 云层独立旋转 ----
    let raf = 0;
    const rotateClouds = () => {
      clouds.rotation.y += CLOUDS_ROT_SPEED * (Math.PI / 180);
      raf = requestAnimationFrame(rotateClouds);
    };
    raf = requestAnimationFrame(rotateClouds);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      scene.remove(clouds);
      clouds.geometry.dispose();
      const mat = clouds.material as THREE.MeshPhongMaterial;
      mat.alphaMap?.dispose();
      mat.dispose();
    };
  }, []);

  return (
    <div className="welcome-earth" style={{ width: size, height: size }} aria-hidden="true">
      <Globe
        ref={globeRef}
        width={size}
        height={size}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={EARTH_IMG}
        bumpImageUrl={BUMPS_IMG}
        showAtmosphere={false}
        showGraticules={false}
        enablePointerInteraction={false}
      />
    </div>
  );
}

/**
 * 把一张「透明度只存在于 alpha 通道」的贴图，转成 three 的 alphaMap
 * （alphaMap 取灰度图的绿通道）。
 * 返回 null 表示这张图没有可用的 alpha 信息。
 */
function buildAlphaMap(image: HTMLImageElement): THREE.CanvasTexture | null {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0, w, h);
  } catch {
    return null;
  }

  let src: ImageData;
  try {
    src = ctx.getImageData(0, 0, w, h);
  } catch {
    // 贴图跨域且未带 CORS 头，无法读取像素
    return null;
  }

  const data = src.data;
  const dst = ctx.createImageData(w, h);

  let sum = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    sum += a;
    if (a >= 250) opaque++;
    dst.data[i] = a;
    dst.data[i + 1] = a;
    dst.data[i + 2] = a;
    dst.data[i + 3] = 255;
  }

  const pixels = w * h;
  // 全透明或全不透明都说明没拿到有效的 alpha 通道
  if (sum === 0 || opaque === pixels) return null;

  ctx.putImageData(dst, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
