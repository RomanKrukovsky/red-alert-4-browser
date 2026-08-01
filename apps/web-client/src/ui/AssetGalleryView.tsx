import '@babylonjs/loaders/glTF';
import { ArcRotateCamera, Color3, Engine, HemisphericLight, Mesh, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { runtimeAssetManifest } from '../assets/runtimeAssetManifest.js';

export const AssetGalleryView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [assetId, setAssetId] = useState(runtimeAssetManifest[0].id);
  const [lod, setLod] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [bounds, setBounds] = useState(false);
  const [animation, setAnimation] = useState('');
  const [stats, setStats] = useState('Загрузка…');
  const definition = useMemo(() => runtimeAssetManifest.find((asset) => asset.id === assetId) ?? runtimeAssetManifest[0], [assetId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor.set(.018, .025, .035, 1);
    sceneRef.current = scene;
    const camera = new ArcRotateCamera('gallery-camera', -Math.PI / 2, Math.PI / 3, 12, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 30;
    const light = new HemisphericLight('gallery-light', new Vector3(.4, 1, -.2), scene);
    light.intensity = 1.4;
    engine.runRenderLoop(() => scene.render());
    const resize = () => engine.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); sceneRef.current = null; engine.dispose(); };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;
    for (const group of [...scene.animationGroups]) group.dispose();
    for (const mesh of [...scene.meshes]) mesh.dispose(false, true);
    const url = lod === 0 ? definition.url : definition.lods[lod - 1]?.url ?? definition.url;
    setStats('Загрузка…');
    void SceneLoader.ImportMeshAsync('', '', url, scene).then((result) => {
      if (cancelled) return;
      const meshes = result.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh);
      const triangles = meshes.reduce((sum, mesh) => sum + Math.floor(mesh.getTotalIndices() / 3), 0);
      for (const mesh of meshes) {
        mesh.showBoundingBox = bounds;
        if (mesh.material) mesh.material.wireframe = wireframe;
      }
      const info = meshes.reduce<{ min: Vector3; max: Vector3 } | undefined>((combined, mesh) => {
        const next = mesh.getHierarchyBoundingVectors();
        return combined ? { min: Vector3.Minimize(combined.min, next.min), max: Vector3.Maximize(combined.max, next.max) } : next;
      }, undefined);
      if (info) {
        const center = info.min.add(info.max).scale(.5);
        const radius = Math.max(2, Vector3.Distance(info.min, info.max) * .8);
        const camera = scene.activeCamera as ArcRotateCamera;
        camera.target = center;
        camera.radius = radius;
      }
      setStats(`${triangles.toLocaleString('ru-RU')} трис · ${meshes.length} мешей · ${result.animationGroups.length} анимаций`);
      setAnimation(result.animationGroups[0]?.name ?? '');
      result.animationGroups[0]?.start(true);
    }).catch((error: unknown) => setStats(`Ошибка: ${error instanceof Error ? error.message : String(error)}`));
    return () => { cancelled = true; };
  }, [definition, lod]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const mesh of scene.meshes) {
      mesh.showBoundingBox = bounds;
      if (mesh.material) mesh.material.wireframe = wireframe;
    }
  }, [bounds, wireframe]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !animation) return;
    for (const group of scene.animationGroups) animation === group.name ? group.start(true) : group.stop();
  }, [animation]);

  return <div className="asset-gallery-view">
    <canvas ref={canvasRef} className="asset-gallery-canvas" />
    <aside className="asset-gallery-panel">
      <div><small>DEV TOOL / REAL GLB</small><h1>ASSET GALLERY</h1></div>
      <label>Модель<select value={assetId} onChange={(event) => { setAssetId(event.target.value); setLod(0); }}>{runtimeAssetManifest.map((asset) => <option key={asset.id} value={asset.id}>{asset.id}</option>)}</select></label>
      <label>LOD<select value={lod} onChange={(event) => setLod(Number(event.target.value))}>{[definition.url, ...definition.lods.map((item) => item.url)].map((_, index) => <option key={index} value={index}>LOD{index}</option>)}</select></label>
      <label>Анимация<select value={animation} onChange={(event) => setAnimation(event.target.value)}><option value="">Нет</option>{sceneRef.current?.animationGroups.map((group) => <option key={group.name}>{group.name}</option>)}</select></label>
      <label><input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} /> Каркас</label>
      <label><input type="checkbox" checked={bounds} onChange={(event) => setBounds(event.target.checked)} /> Габариты</label>
      <p>{stats}</p>
      <p>Мышь: вращение · колесо: масштаб</p>
      <button onClick={onClose}>Закрыть</button>
    </aside>
  </div>;
};
