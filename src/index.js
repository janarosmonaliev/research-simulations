import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Matrix4 } from "three";

var renderer, camera, scene, controls;
var plane, cube;

init();
animate();

function init() {
  // SECTION: Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(new THREE.Color(0xb0b0b0));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // SECTION: Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  // camera.position.set(1000, 50, 1500);
  scene.add(camera);

  // SECTION: Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;

  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minPolarAngle = Math.PI * 0.1;
  controls.minDistance = 500;
  controls.maxDistance = 5000;

  // NOTE: Skybox
  var skyBoxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
  var skyBoxMaterial = new THREE.MeshBasicMaterial({
    color: 0xf2f2f2,
    side: THREE.BackSide,
  });
  var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
  scene.add(skyBox);
  scene.fog = new THREE.Fog(skyBoxMaterial.color, 1500, 4000);

  // NOTE: Plane
  var planeGeometry = new THREE.PlaneBufferGeometry(3000, 3000);
  var planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x373737,
    polygonOffset: true,
    polygonOffsetFactor: 5,
    side: THREE.DoubleSide,
  });
  plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  // NOTE Light
  var ambientLight = new THREE.AmbientLight(0x787878);
  scene.add(ambientLight);

  var light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(-500, 1000, -300);

  // NOTE Fix this issue
  // light.shadow.camera = new THREE.OrthographicCamera(
  //   -1000,
  //   1000,
  //   1000,
  //   -1000,
  //   0.5,
  //   2000
  // );
  light.shadow.camera.near = 50;
  light.shadow.camera.far = 2000;
  light.shadow.camera.left = -2000;
  light.shadow.camera.right = 2000;
  light.shadow.camera.top = 2000;
  light.shadow.camera.bottom = -2000;

  light.castShadow = true;
  light.shadow.mapSize.height = 3096;
  light.shadow.mapSize.width = 3096;
  // light.shadowCameraVisible = true;
  scene.add(light);

  // Helpers
  // var helperCamera = new THREE.CameraHelper(light.shadow.camera);
  // scene.add(helperCamera);
  // var helper = new THREE.DirectionalLightHelper(light, 10, 0xff1c1c);
  // scene.add(helper);

  // SECTION City Generation
  scene.add(generateCity(3000, 3000));

  // Reference Material
  var geometry = new THREE.BoxGeometry(30, 30, 30);
  var material = new THREE.MeshLambertMaterial({ color: 0xadb5bd });
  cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  cube.position.y = 15;
  scene.add(cube);

  camera.position.y = 2000;
  camera.position.z = 1000;
  camera.position.x = 1000;

  window.addEventListener("resize", onWindowResize, false);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
}

function generateCity(width, length) {
  var districtMinSize = 80;
  var gridWidth = Math.floor(width / districtMinSize);
  var gridLength = Math.floor(length / districtMinSize);
  var cityGrid = generateCityGrid(gridWidth, gridLength, districtMinSize);

  // Creating districts
  var cityGeometry = new THREE.Geometry();
  var value = 0;
  while (value <= 2) {
    for (var i = 0; i < gridWidth; i++) {
      for (var j = 0; j < gridLength; j++) {
        if (cityGrid[i][j] == value) {
          for (var k = i; k < gridWidth; k++) {
            if (cityGrid[k][j] != value) {
              break;
            }
          }
          var districtWidth = k - i;

          for (var k = j + 1; k < gridLength; k++) {
            if (cityGrid[i][k] != value) {
              break;
            }
          }
          var districtLength = k - j;

          for (var k = 0; k < districtWidth; k++) {
            for (var l = 0; l < districtLength; l++) {
              cityGrid[k + i][l + j] = 1;
            }
          }

          districtWidth *= districtMinSize;
          districtLength *= districtMinSize;

          var districtHeight = generateDistrictHeightRange();
          var district = generateDistrict(
            districtWidth,
            districtLength,
            districtHeight.x,
            districtHeight.y
          );
          district.applyMatrix4(
            new THREE.Matrix4().makeTranslation(
              i * districtMinSize,
              0,
              j * districtMinSize
            )
          );
          // NOTE Deprecated function
          THREE.GeometryUtils.merge(cityGeometry, district);
          // cityGeometry.merge(district);
        }
      }
    }
    value += 2;
  }
  var material = new THREE.MeshLambertMaterial({
    vertexColors: THREE.VertexColors,
  });
  var mesh = new THREE.Mesh(cityGeometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.applyMatrix4(
    new THREE.Matrix4().makeTranslation(-width / 2, 0, -length / 2)
  );

  return mesh;
}

function generateCityGrid(gridWidth, gridLength, districtMinSize) {
  var cityGrid = new Array();

  // Initialize city grid as an Array
  for (var i = 0; i < gridWidth; i++) {
    cityGrid[i] = new Array();
    for (var j = 0; j < gridLength; j++) {
      cityGrid[i][j] = 0;
    }
  }

  var min = 2;
  var max = 4;

  // Horizontal Routes
  for (var i = 2; i < gridWidth - 2; i += Math.floor(random(min, max)) + 1) {
    for (var j = 2; j < gridLength - 2; j++) {
      cityGrid[i][j] = 1;
    }
  }

  // Vertical Routes
  for (var i = 2; i < gridWidth - 2; i += Math.floor(random(min, max)) + 1) {
    for (var j = 2; j < gridLength - 2; j++) {
      cityGrid[j][i] = 1;
    }
  }

  // NOTE IDK Why I am doing this.
  // 0 = building, 1 = roads
  for (var i = 0; i < gridWidth; i++) {
    cityGrid[i][2] = 1;
  }
  for (var i = 0; i < gridWidth; i++) {
    cityGrid[i][gridWidth - 3] = 1;
  }
  for (var i = 0; i < gridLength; i++) {
    cityGrid[2][i] = 1;
  }
  for (var i = 0; i < gridLength; i++) {
    cityGrid[gridLength - 3][i] = 1;
  }

  for (var i = 2; i < gridWidth - 2; i++) {
    for (var j = 2; j < gridLength - 2; j++) {
      // We find a building
      if (cityGrid[i][j] == 0) {
        // if building is adjacent to horizontal road
        if (cityGrid[i - 1][j] == 1) {
          if (Math.floor(random(0, 10)) == 3) {
            // NOTE ?? Upper left corner
            for (var k = j - 1; cityGrid[i][k] == 0 && k >= 0; k--) {}
            k++; // reposition ??
            for (; cityGrid[i][k] == 0; k++) {
              cityGrid[i - 1][k] = 2;
            }
          }
          // if building is adjacent to vertical road
        } else if (cityGrid[i][j + 1] == 1) {
          if (Math.floor(random(0, 10)) == 3) {
            // NOTE ?? Upper right corner
            for (var k = i - 1; cityGrid[k][j] == 0 && k >= 0; k--) {}
            k++; // reposition ??
            for (; cityGrid[k][j] == 0; k++) {
              cityGrid[k][j + 1] = 2;
            }
          }
        }
      }
    }
  }
  return cityGrid;
}

function generateDistrictHeightRange() {
  var ranges = new Array();
  var i = 0;
  ranges[i++] = new THREE.Vector2(30, 60); // Very small
  ranges[i++] = new THREE.Vector2(50, 90); // Small
  ranges[i++] = new THREE.Vector2(80, 150); // Medium
  ranges[i++] = new THREE.Vector2(100, 250); // Medium-tall
  ranges[i++] = new THREE.Vector2(90, 350); // Tall

  return ranges[Math.floor(random(0, i))];
}

function generateDistrict(width, length, minHeight, maxHeight) {
  var districtGeometry = new THREE.Geometry();
  var rowWidth = 0;
  var rowLength = 0;
  var totalLength = 0;

  for (var j = 0; j < length; j += random(5, 10)) {
    if (length - j < 45) break;

    var rowGeometry = new THREE.Geometry();
    for (var i = 0; i < width; i += random(5, 10)) {
      if (width - i < 45) break;

      var building = generateBuilding(length - j, minHeight, maxHeight);

      if (width - i < building.Width) {
        building = generateBuilding(width - i, minHeight, maxHeight);
      }

      var floorWidth = Math.floor(building.Width / 5) * 5 + 5;
      var floorLength = Math.floor(building.Length / 5) * 5 + 5;
      if (floorLength > rowLength) rowLength = floorLength;

      building.Mesh.position.x = i + floorWidth / 2.0;
      building.Mesh.position.z = j + rowLength / 2.0;

      // NOTE Deprecated
      THREE.GeometryUtils.merge(rowGeometry, building.Mesh);
      // rowGeometry.merge(building.Mesh);
      i += floorWidth;
      rowWidth = i;
    }

    rowGeometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation((width - rowWidth) / 2.0, 0, 0)
    );
    // NOTE Deprecated
    THREE.GeometryUtils.merge(districtGeometry, rowGeometry);
    // districtGeometry.merge(rowGeometry);

    j += rowLength;
    totalLength = j;

    rowWidth = 0;
    rowLength = 0;
  }

  districtGeometry.applyMatrix4(
    new Matrix4().makeTranslation(0, 0, (length - totalLength) / 2.0)
  );

  var planeGeometry = new THREE.PlaneGeometry(width, length);
  var planeMaterial = new THREE.MeshLambertMaterial();
  var plane = new THREE.Mesh(planeGeometry, planeMaterial);

  var planeColor = new THREE.Color(0xb8b8b8);
  plane.geometry.faces[0].vertexColors = [planeColor, planeColor, planeColor];
  plane.geometry.faces[1].vertexColors = [planeColor, planeColor, planeColor];

  plane.rotation.x = -0.5 * Math.PI;
  plane.position.x = width / 2;
  plane.position.y = 1;
  plane.position.z = length / 2;

  // NOTE Deprecated
  THREE.GeometryUtils.merge(districtGeometry, plane);
  // districtGeometry.merge(plane);

  var material = new THREE.MeshLambertMaterial({
    vertexColors: THREE.VertexColors,
  });
  var mesh = new THREE.Mesh(districtGeometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function generateBuilding(bldgMaxWidth, bldgMinHeight, bldgMaxHeight) {
  var minWidth = 40;
  var maxWidth = 60;

  bldgMaxWidth =
    bldgMaxWidth < minWidth
      ? minWidth
      : bldgMaxWidth > maxWidth
      ? maxWidth
      : bldgMaxWidth;

  var width = random(minWidth, bldgMaxWidth);
  var height = random(bldgMinHeight, bldgMaxHeight);
  var length = width;

  var geometry = new THREE.BoxGeometry(width, height, length);
  geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, height / 2, 0));

  var material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    vertexColors: THREE.VertexColors,
  });
  var mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  var light = new THREE.Color(0xe8e8e8); // 0xFFFFFF
  var shadow = new THREE.Color(0x606060); // 0x707070

  var value = 1 - Math.random() * Math.random() * Math.random();
  var fade = 1.5; // 0x3DA2EF
  var baseColor = new THREE.Color().setRGB(
    value /*+ Math.random()*/ * fade,
    value /*+ Math.random()*/ * fade,
    value /*+ Math.random()*/ * fade
  );
  var topColor = baseColor.clone().multiply(light);
  var bottomColor = baseColor.clone().multiply(shadow);

  // var random_building_color = Math.random() * Math.random() * Math.random();

  // if (random_building_color > 0.65) {
  //   baseColor = new THREE.Color().setRGB(0.9, 0.2, 0.2);
  //   topColor = baseColor.clone().multiply(light);
  //   bottomColor = baseColor.clone().multiply(shadow);
  // }

  var faces = mesh.geometry.faces;
  var i = 0;

  // Front face
  faces[i++].vertexColors = [topColor, bottomColor, topColor];
  faces[i++].vertexColors = [bottomColor, bottomColor, topColor];

  // Back face
  faces[i++].vertexColors = [topColor, bottomColor, topColor];
  faces[i++].vertexColors = [bottomColor, bottomColor, topColor];

  // Top face
  faces[i++].vertexColors = [baseColor, baseColor, baseColor];
  faces[i++].vertexColors = [baseColor, baseColor, baseColor];

  // Bottom face
  i += 2;

  // Left face
  faces[i++].vertexColors = [topColor, bottomColor, topColor];
  faces[i++].vertexColors = [bottomColor, bottomColor, topColor];

  // Right face
  faces[i++].vertexColors = [topColor, bottomColor, topColor];
  faces[i++].vertexColors = [bottomColor, bottomColor, topColor];

  mesh.geometry.faces = faces;

  return new Building(width, height, length, mesh);
}

function Building(Width, Height, Length, Mesh) {
  this.Width = Width;
  this.Height = Height;
  this.Length = Length;
  this.Mesh = Mesh;
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
