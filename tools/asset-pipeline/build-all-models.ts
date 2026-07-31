import path from 'path';
import { SimpleGLBWriter } from './glb-builder.js';

const rootDir = process.cwd();
const modelsDir = path.join(rootDir, 'apps/web-client/public/assets/models');

console.log('=== Building Production GLB Models for RA4 Browser RTS ===');

// 1. ОБТ-92 «Гранит» (Soviet MBT-92 Granit Tank)
{
  const writer = new SimpleGLBWriter();
  const matArmor = writer.addMaterial('mat_soviet_armor', [0.7, 0.15, 0.15, 1.0], 0.6, 0.3);
  const matSteel = writer.addMaterial('mat_dark_steel', [0.15, 0.18, 0.2, 1.0], 0.8, 0.2);
  const matTreads = writer.addMaterial('mat_treads', [0.08, 0.08, 0.08, 1.0], 0.3, 0.7);

  const meshChassis = writer.addBoxMesh('mesh_chassis', 3.2, 0.8, 4.4, matArmor);
  const meshTreads = writer.addBoxMesh('mesh_treads', 3.6, 0.7, 4.6, matTreads);
  const meshTurret = writer.addBoxMesh('mesh_turret', 2.2, 0.7, 2.4, matArmor);
  const meshBarrel = writer.addBoxMesh('mesh_barrel', 0.25, 0.25, 2.8, matSteel);

  // Nodes hierarchy
  const nChassis = writer.addNode({ name: 'Chassis', translation: [0, 0.5, 0], mesh: meshChassis });
  const nTreads = writer.addNode({ name: 'Treads', translation: [0, 0.35, 0], mesh: meshTreads });
  
  const nMuzzle = writer.addNode({ name: 'Muzzle', translation: [0, 0, 1.5] });
  const nGunPitch = writer.addNode({ name: 'GunPitch', translation: [0, 0.1, 0.8], mesh: meshBarrel, children: [nMuzzle] });
  const nTurretYaw = writer.addNode({ name: 'TurretYaw', translation: [0, 1.1, 0.2], mesh: meshTurret, children: [nGunPitch] });

  const nSelection = writer.addNode({ name: 'SelectionAnchor', translation: [0, 0, 0] });
  const nHealthBar = writer.addNode({ name: 'HealthBarAnchor', translation: [0, 2.2, 0] });

  writer.addNode({
    name: 'VehicleRoot',
    children: [nChassis, nTreads, nTurretYaw, nSelection, nHealthBar]
  });

  writer.writeToGLB(path.join(modelsDir, 'units/SU_GranitMBT.glb'));
}

// 2. ГРМ-8 «Богатырь» (Soviet Harvester)
{
  const writer = new SimpleGLBWriter();
  const matArmor = writer.addMaterial('mat_soviet_heavy', [0.65, 0.18, 0.12, 1.0], 0.5, 0.4);
  const matSteel = writer.addMaterial('mat_industrial_steel', [0.2, 0.22, 0.25, 1.0], 0.7, 0.3);
  const matContainer = writer.addMaterial('mat_ore_container', [0.8, 0.5, 0.1, 1.0], 0.4, 0.5);

  const meshChassis = writer.addBoxMesh('mesh_harvester_chassis', 3.4, 1.0, 5.2, matArmor);
  const meshContainer = writer.addBoxMesh('mesh_ore_container', 2.8, 1.4, 3.0, matContainer);
  const meshCab = writer.addBoxMesh('mesh_harvester_cab', 2.4, 1.1, 1.6, matSteel);

  const nContainer = writer.addNode({ name: 'HarvesterContainer', translation: [0, 1.4, -0.8], mesh: meshContainer });
  const nCab = writer.addNode({ name: 'HarvesterCab', translation: [0, 1.1, 1.5], mesh: meshCab });
  const nChassis = writer.addNode({ name: 'Chassis', translation: [0, 0.6, 0], mesh: meshChassis });

  const nSelection = writer.addNode({ name: 'SelectionAnchor', translation: [0, 0, 0] });
  const nHealthBar = writer.addNode({ name: 'HealthBarAnchor', translation: [0, 2.4, 0] });

  writer.addNode({
    name: 'VehicleRoot',
    children: [nChassis, nContainer, nCab, nSelection, nHealthBar]
  });

  writer.writeToGLB(path.join(modelsDir, 'units/SU_BogatyrOreCarrier.glb'));
}

// 3. МС-12 «Рубеж» (Soviet Infantry)
{
  const writer = new SimpleGLBWriter();
  const matUniform = writer.addMaterial('mat_infantry_uniform', [0.2, 0.25, 0.22, 1.0], 0.2, 0.8);
  const matArmor = writer.addMaterial('mat_infantry_armor', [0.55, 0.15, 0.15, 1.0], 0.5, 0.5);
  const matWeapon = writer.addMaterial('mat_assault_rifle', [0.1, 0.1, 0.1, 1.0], 0.8, 0.2);

  const meshTorso = writer.addBoxMesh('mesh_torso', 0.5, 0.7, 0.3, matUniform);
  const meshArmor = writer.addBoxMesh('mesh_vest', 0.55, 0.55, 0.35, matArmor);
  const meshHelmet = writer.addBoxMesh('mesh_helmet', 0.35, 0.35, 0.35, matArmor);
  const meshRifle = writer.addBoxMesh('mesh_rifle', 0.1, 0.12, 0.8, matWeapon);

  const nMuzzle = writer.addNode({ name: 'Muzzle', translation: [0, 0, 0.5] });
  const nWeapon = writer.addNode({ name: 'AssaultRifle', translation: [0.3, 0.9, 0.3], mesh: meshRifle, children: [nMuzzle] });

  const nHelmet = writer.addNode({ name: 'Helmet', translation: [0, 1.5, 0], mesh: meshHelmet });
  const nArmor = writer.addNode({ name: 'BodyArmor', translation: [0, 1.0, 0], mesh: meshArmor });
  const nTorso = writer.addNode({ name: 'Torso', translation: [0, 0.9, 0], mesh: meshTorso });

  const nSelection = writer.addNode({ name: 'SelectionAnchor', translation: [0, 0, 0] });
  const nHealthBar = writer.addNode({ name: 'HealthBarAnchor', translation: [0, 1.8, 0] });

  writer.addNode({
    name: 'CharacterRoot',
    children: [nTorso, nArmor, nHelmet, nWeapon, nSelection, nHealthBar]
  });

  writer.writeToGLB(path.join(modelsDir, 'units/SU_RubezhRifleman.glb'));
}

// 4. Тяжёлый завод (Heavy Factory)
{
  const writer = new SimpleGLBWriter();
  const matConcrete = writer.addMaterial('mat_factory_concrete', [0.35, 0.35, 0.38, 1.0], 0.1, 0.9);
  const matMetal = writer.addMaterial('mat_factory_metal', [0.25, 0.28, 0.32, 1.0], 0.7, 0.3);
  const matAccent = writer.addMaterial('mat_factory_red', [0.6, 0.12, 0.12, 1.0], 0.5, 0.4);

  const meshMain = writer.addBoxMesh('mesh_factory_main', 8.0, 3.5, 10.0, matConcrete);
  const meshBay = writer.addBoxMesh('mesh_vehicle_bay', 4.5, 2.5, 6.0, matMetal);
  const meshStack = writer.addBoxMesh('mesh_smoke_stack', 1.0, 5.0, 1.0, matMetal);

  const nStack1 = writer.addNode({ name: 'SmokeStack1', translation: [-3.0, 2.5, -3.5], mesh: meshStack });
  const nStack2 = writer.addNode({ name: 'SmokeStack2', translation: [-1.5, 2.5, -3.5], mesh: meshStack });
  const nBay = writer.addNode({ name: 'VehicleBay', translation: [0, 1.25, 2.0], mesh: meshBay });
  const nMain = writer.addNode({ name: 'MainBuilding', translation: [0, 1.75, 0], mesh: meshMain });

  const nSelection = writer.addNode({ name: 'SelectionAnchor', translation: [0, 0, 0] });
  const nHealthBar = writer.addNode({ name: 'HealthBarAnchor', translation: [0, 5.5, 0] });

  writer.addNode({
    name: 'BuildingRoot',
    children: [nMain, nBay, nStack1, nStack2, nSelection, nHealthBar]
  });

  writer.writeToGLB(path.join(modelsDir, 'buildings/SU_HeavyFactory.glb'));
}

// 5. Пулемётный дот (Machinegun Pillbox)
{
  const writer = new SimpleGLBWriter();
  const matBunker = writer.addMaterial('mat_bunker_concrete', [0.3, 0.32, 0.3, 1.0], 0.1, 0.8);
  const matSandbag = writer.addMaterial('mat_sandbag', [0.55, 0.48, 0.35, 1.0], 0.0, 0.95);
  const matGun = writer.addMaterial('mat_twin_mg', [0.1, 0.1, 0.12, 1.0], 0.85, 0.15);

  const meshBunker = writer.addBoxMesh('mesh_bunker', 3.0, 1.2, 3.0, matBunker);
  const meshSandbags = writer.addBoxMesh('mesh_sandbags', 3.6, 0.6, 3.6, matSandbag);
  const meshTurret = writer.addBoxMesh('mesh_mg_turret', 1.2, 0.5, 1.2, matGun);

  const nTurret = writer.addNode({ name: 'TwinTurret', translation: [0, 0.9, 0], mesh: meshTurret });
  const nSandbags = writer.addNode({ name: 'SandbagWall', translation: [0, 0.3, 0], mesh: meshSandbags });
  const nBunker = writer.addNode({ name: 'ConcreteBunker', translation: [0, 0.6, 0], mesh: meshBunker });

  const nSelection = writer.addNode({ name: 'SelectionAnchor', translation: [0, 0, 0] });
  const nHealthBar = writer.addNode({ name: 'HealthBarAnchor', translation: [0, 2.0, 0] });

  writer.addNode({
    name: 'BuildingRoot',
    children: [nBunker, nSandbags, nTurret, nSelection, nHealthBar]
  });

  writer.writeToGLB(path.join(modelsDir, 'buildings/SU_Pillbox.glb'));
}

// 6. Окружение: Сосна (Pine Tree 01)
{
  const writer = new SimpleGLBWriter();
  const matTrunk = writer.addMaterial('mat_tree_bark', [0.25, 0.18, 0.12, 1.0], 0.05, 0.95);
  const matFoliage = writer.addMaterial('mat_pine_foliage', [0.12, 0.28, 0.15, 1.0], 0.05, 0.9);

  const meshTrunk = writer.addBoxMesh('mesh_tree_trunk', 0.5, 6.0, 0.5, matTrunk);
  const meshFoliage = writer.addBoxMesh('mesh_pine_canopy', 2.8, 5.0, 2.8, matFoliage);

  const nFoliage = writer.addNode({ name: 'Canopy', translation: [0, 4.5, 0], mesh: meshFoliage });
  const nTrunk = writer.addNode({ name: 'Trunk', translation: [0, 3.0, 0], mesh: meshTrunk });

  writer.addNode({
    name: 'PropRoot',
    children: [nTrunk, nFoliage]
  });

  writer.writeToGLB(path.join(modelsDir, 'environment/pine_tree_01.glb'));
}

// 7. Окружение: Скала (Coast Rocks 01)
{
  const writer = new SimpleGLBWriter();
  const matRock = writer.addMaterial('mat_coast_rock', [0.4, 0.42, 0.45, 1.0], 0.2, 0.8);

  const meshRock = writer.addBoxMesh('mesh_coast_rock', 3.5, 2.2, 3.0, matRock);
  const nRock = writer.addNode({ name: 'RockMesh', translation: [0, 1.1, 0], mesh: meshRock });

  writer.addNode({
    name: 'PropRoot',
    children: [nRock]
  });

  writer.writeToGLB(path.join(modelsDir, 'environment/coast_rocks_01.glb'));
}

// 8. Декорации: Бетонный барьер (Concrete Barrier)
{
  const writer = new SimpleGLBWriter();
  const matBarrier = writer.addMaterial('mat_barrier_concrete', [0.5, 0.52, 0.55, 1.0], 0.1, 0.9);

  const meshBarrier = writer.addBoxMesh('mesh_concrete_barrier', 2.0, 0.8, 0.6, matBarrier);
  const nBarrier = writer.addNode({ name: 'BarrierMesh', translation: [0, 0.4, 0], mesh: meshBarrier });

  writer.addNode({
    name: 'PropRoot',
    children: [nBarrier]
  });

  writer.writeToGLB(path.join(modelsDir, 'props/concrete_road_barrier.glb'));
}

// 9. Декорации: Военный ящик (Military Crate)
{
  const writer = new SimpleGLBWriter();
  const matWood = writer.addMaterial('mat_military_crate', [0.35, 0.38, 0.25, 1.0], 0.1, 0.85);

  const meshCrate = writer.addBoxMesh('mesh_military_crate', 1.0, 0.8, 1.0, matWood);
  const nCrate = writer.addNode({ name: 'CrateMesh', translation: [0, 0.4, 0], mesh: meshCrate });

  writer.addNode({
    name: 'PropRoot',
    children: [nCrate]
  });

  writer.writeToGLB(path.join(modelsDir, 'props/old_military_crate.glb'));
}

console.log('SUCCESS! All production GLB models built cleanly.');
