import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

/* CLASSES */
class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
};

class BasicCharacterController {

  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._animations = {};
    this._input = new BasicCharacterInput();
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations));

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();

    loader.setPath('./Models/');
    loader.load('Y-bot.fbx', (fbx) => {
      fbx.scale.setScalar(0.05);
      fbx.traverse(c => {
        c.castShadow = true
      });

      this._target = fbx;
      this._params.scene.add(this._target);
      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();


      this._manager.onLoad = () => {
        this._stateMachine.SetState('Standing Idle.fbx');
      };


      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };
      const loader = new FBXLoader(this._manager);

      loader.setPath('./Anims/');
      var animationFiles = [
        'Standing 2H Magic Attack 01.fbx',
        'Standing Idle.fbx',
        'Standing Jump Running Landing.fbx',
        'Standing Jump Running.fbx',
        'Standing Jump.fbx',
        'Standing Land To Standing Idle.fbx',
        'Standing Run Forward.fbx',
        'Standing Walk Forward.fbx'
      ];
      for (let i = 0; i < animationFiles.length; i++) {
        loader.load(animationFiles[i], function (a) { _OnLoad(animationFiles[i], a); }, function (xhr) {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        }, function (error) {
          console.log(error);
        });
      }

    });
  }

  Update(timeInSeconds) {
    if (!this._target) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
      Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(2.0);
    }

    if (this._stateMachine._currentState.Name == 'Standing 2H Magic Attack 01.fbx') {
      acc.multiplyScalar(0.0);
    }

    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }

    controlObject.quaternion.copy(_R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    oldPosition.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }

  _getObjRef() {
    return this._target
  }
};

class BasicCharacterInput {
  constructor() {
    this._Init();
  }
  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87:
        this._keys.forward = true;
        break;
      case 65:
        this._keys.left = true;
        break;
      case 83:
        this._keys.backward = true;
        break;
      case 68:
        this._keys.right = true;
        break;
      case 32:
        this._keys.space = true;
        break;
      case 16:
        this._keys.shift = true;
        break;

    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87:
        this._keys.forward = false;
        break;
      case 65:
        this._keys.left = false;
        break;
      case 83:
        this._keys.backward = false;
        break;
      case 68:
        this._keys.right = false;
        break;
      case 32:
        this._keys.space = false;
        break;
      case 16:
        this._keys.shift = false;
        break;

    }
  }
};

class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);
    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
};

class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState('Standing Idle.fbx', IdleState);
    this._AddState('Standing Walk Forward.fbx', WalkState);
    this._AddState('Standing Run Forward.fbx', RunState);
    this._AddState('Standing 2H Magic Attack 01.fbx', AttackState);
  }
};


class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() { }
  Exit() { }
  Update() { }
};

class AttackState extends State {
  constructor(parent) {
    super(parent);

    this._FinishedCallback = () => {
      this._Finished();
    }
  }

  get Name() {
    return 'Standing 2H Magic Attack 01.fbx';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['Standing 2H Magic Attack 01.fbx'].action;
    const mixer = curAction.getMixer();
    mixer.addEventListener('finished', this._FinishedCallback);

    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.reset();
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  _Finished() {
    this._Cleanup();
    this._parent.SetState('Standing Idle.fbx');
  }

  _Cleanup() {
    const action = this._parent._proxy._animations['Standing 2H Magic Attack 01.fbx'].action;

    action.getMixer().removeEventListener('finished', this._CleanupCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {
  }
};


class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'Standing Walk Forward.fbx';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['Standing Walk Forward.fbx'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'Standing Run Forward.fbx') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState('Standing Run Forward.fbx');
      }
      return;
    }

    this._parent.SetState('Standing Idle.fbx');
  }
};


class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'Standing Run Forward.fbx';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['Standing Run Forward.fbx'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'Standing Walk Forward.fbx') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState('Standing Walk Forward.fbx');
      }
      return;
    }

    this._parent.SetState('Standing Idle.fbx');
  }
};


class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'Standing Idle.fbx';
  }

  Enter(prevState) {
    //console.log(this._parent)
    const idleAction = this._parent._proxy._animations['Standing Idle.fbx'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('Standing Walk Forward.fbx');
    } else if (input._keys.space) {
      this._parent.SetState('Standing 2H Magic Attack 01.fbx');
    }
  }
};

class ProjectileGen {

  constructor(PlayerObj, scene) {
    this._scene = scene
    this._player = PlayerObj

    this.geometryList = [
      new THREE.BoxGeometry(5, 5, 5),
      new THREE.DodecahedronGeometry(5),
    ];

    const loader = new THREE.TextureLoader();

    this.textureList = [
      loader.load('./Textures/q1checks.png'),
      loader.load('./Textures/templategrid/TemplateGrid_albedo.png')
    ];

    this.materialList = [
      new THREE.MeshBasicMaterial({
        map: this.textureList[0],
      }),
      new THREE.MeshToonMaterial({
        map: this.textureList[1],
      }),
    ];

    this.proj;
  }


  Shoot() {
    this.proj = new THREE.Mesh(this.geometryList[Math.round(Math.random())],
      this.materialList[Math.round(Math.random())]);
    this.proj.castShadow = true
    this._scene.add(this.proj)
    console.log(this.proj.material.map)

  }

  Update(timeElapsed) {
    if (!this.proj.position.x){
      this._player.getWorldPosition(this.proj.position)
      this.proj.translateX(getRandomInt(-5, 5))
      this.proj.translateY(8)
      this.proj.translateZ(getRandomInt(-5, 5))
    }
    this._player.getWorldQuaternion(this.proj.quaternion)
  }

};


/* Setup Scene, Camera, Renderer */
var scene = new THREE.Scene();
const loader = new THREE.TextureLoader();
const texture = loader.load(
  './Textures/shack-cantley-night-sky.jpg',
  () => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
  });

/* DEBUG */
scene.add(new THREE.AxesHelper(5));
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

// Controls
var orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 1.5;

orbitControls.target.y = 10
orbitControls.update();

/* Setup Mesh */
generateFloor();
// const geometry = new THREE.PlaneGeometry(100, 100)
// const material = new THREE.MeshBasicMaterial({
//     color: 0x00ff00,
// })
// const plane = new THREE.Mesh(geometry, material)
// scene.add(plane)
/* Setup 3D Model & Animation */



/* Setup Light, Shadows, Fogs */
light();
shadow();

const params = {
  camera: camera,
  scene: scene,
}
let _MODEL = new BasicCharacterController(params);

// Setup animate
var clock = new THREE.Clock();
_MODEL.Update(clock.getDelta());
// Setup projectile after model


let _SHOOT = new ProjectileGen(_MODEL._getObjRef(), scene);
_SHOOT.Shoot();
function animate() {
  requestAnimationFrame(animate);
  orbitControls.update();
  if (!_SHOOT._player){
    _SHOOT._player = _MODEL._getObjRef();
  }
  _MODEL.Update(clock.getDelta());
  if (_SHOOT._player) _SHOOT.Update(clock.getDelta());
  render();
}
function render() {
  renderer.render(scene, camera);
}
animate();
/* HELPER FUNCTION FROM https://github.com/tamani-coding/threejs-character-controls-example/tree/main */
function generateFloor() {
  // TEXTURES
  var textureLoader = new THREE.TextureLoader();
  var placeholder = textureLoader.load("./Textures/placeholder.png");
  var WIDTH = 80;
  var LENGTH = 80;
  var geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  var material = new THREE.MeshStandardMaterial({
    map: placeholder
  });
  wrapAndRepeatTexture(material.map);
  // const material = new THREE.MeshPhongMaterial({ map: placeholder})
  var floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
}
function wrapAndRepeatTexture(map) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.x = map.repeat.y = 10;
}
function light() {
  scene.add(new THREE.AmbientLight(0xe3f8ff, 0.4));
  var dirLight = new THREE.DirectionalLight(0xf0fbff, 1);
  dirLight.position.set(60, 100, 20);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
  // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

function shadow() {
  {
    const color = 0x000c29;  // white
    const near = 5;
    const far = 50;
    scene.fog = new THREE.Fog(color, near, far);
  }
}

function debug(object) {
  console.log(object.position)
  console.log(object.quaternion)
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}