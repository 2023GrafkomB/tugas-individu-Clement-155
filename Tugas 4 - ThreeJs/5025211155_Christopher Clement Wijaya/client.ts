import * as THREE from './node_modules/three/build/three.module.js'
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js'
import { FBXLoader } from './node_modules/three/examples/jsm/loaders/FBXLoader.js'
/* UNUSED BOILERPLATE CODE */
// import Stats from 'three/addons/libs/stats.module.js'
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// Setup Scene, Camera, Renderer
const scene = new THREE.Scene()
/* DEBUG */
scene.add(new THREE.AxesHelper(5))

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.z = 50

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
renderer.shadowMap.enabled = true;
// Controls
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.enableDamping = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 15
orbitControls.enablePan = false
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
orbitControls.update();
/* Setup Mesh */
generateFloor()
// const geometry = new THREE.PlaneGeometry(100, 100)
// const material = new THREE.MeshBasicMaterial({
//     color: 0x00ff00,
// })
// const plane = new THREE.Mesh(geometry, material)
// scene.add(plane)

/* Setup 3D Model & Animation */
let mixer: THREE.AnimationMixer
let modelReady = false
const animationActions: THREE.AnimationAction[] = []
let activeAction: THREE.AnimationAction
let lastAction: THREE.AnimationAction
const fbxLoader = new FBXLoader()

fbxLoader.load(
    './Models/Y-bot.fbx',
    (object) => {
        object.scale.set(0.01, 0.01, 0.01)
        mixer = new THREE.AnimationMixer(object)
        console.log(mixer)

        const animationAction = mixer.clipAction(
            (object).animations[0]
        )
        animationActions.push(animationAction)
        // animationsFolder.add(animations, 'default')
        activeAction = animationActions[0]

        scene.add(object)

        //add an animation from file
        const animationFiles = [
            'Standing 2H Magic Attack 01.fbx',
            'Standing Idle.fbx',
            'Standing Jump Running Landing.fbx',
            'Standing Jump Running.fbx',
            'Standing Jump.fbx',
            'Standing Land To Standing Idle.fbx',
            'Standing Run Forward.fbx',
            'Standing Walk Forward.fbx'
        ]
        for (let i = 0; i < animationFiles.length; i++) {
            fbxLoader.load(
                './Anims/' + animationFiles[i],
                (object) => {
                    console.log('loaded' + animationFiles[i])

                    const animationAction = mixer.clipAction(
                        (object).animations[0]
                    )
                    animationActions.push(animationAction)
                },
                (xhr) => {
                    console.log(
                        (xhr.loaded / xhr.total) * 100 + '% loaded'
                    )
                },
                (error) => {
                    console.log(error)
                    modelReady = false
                }
            )

        }
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
        modelReady = false
    }
)

/* From https://sbcode.net/threejs/fbx-animation/ */

const setAction = (toAction) => {
    if (toAction != activeAction) {
        lastAction = activeAction
        activeAction = toAction
        lastAction.stop()
        //lastAction.fadeOut(1)
        activeAction.reset()
        //activeAction.fadeIn(1)
        activeAction.play()
    }
}

//         fbxLoader.load(
//             'models/vanguard@samba.fbx',
//             (object) => {
//                 console.log('loaded samba')

//                 const animationAction = mixer.clipAction(
//                     (object ).animations[0]
//                 )
//                 animationActions.push(animationAction)
//                 animationsFolder.add(animations, 'samba')

//                 //add an animation from another file
//                 fbxLoader.load(
//                     'models/vanguard@bellydance.fbx',
//                     (object) => {
//                         console.log('loaded bellydance')
//                         const animationAction = mixer.clipAction(
//                             (object ).animations[0]
//                         )
//                         animationActions.push(animationAction)
//                         animationsFolder.add(animations, 'bellydance')

//                         //add an animation from another file
//                         fbxLoader.load(
//                             'models/vanguard@goofyrunning.fbx',
//                             (object) => {
//                                 console.log('loaded goofyrunning')
//                                 ;(
//                                     object 
//                                 ).animations[0].tracks.shift() //delete the specific track that moves the object forward while running
//                                 //console.dir((object ).animations[0])
//                                 const animationAction = mixer.clipAction(
//                                     (object ).animations[0]
//                                 )
//                                 animationActions.push(animationAction)
//                                 animationsFolder.add(animations, 'goofyrunning')

//                                 modelReady = true
//                             },
//                             (xhr) => {
//                                 console.log(
//                                     (xhr.loaded / xhr.total) * 100 + '% loaded'
//                                 )
//                             },
//                             (error) => {
//                                 console.log(error)
//                             }
//                         )
//                     },
//                     (xhr) => {
//                         console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
//                     },
//                     (error) => {
//                         console.log(error)
//                     }
//                 )
//             },
//             (xhr) => {
//                 console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
//             },
//             (error) => {
//                 console.log(error)
//             }
//         )
//     },
//     (xhr) => {
//         console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
//     },
//     (error) => {
//         console.log(error)
//     }
// )


/* Setup Light, Shadows, Fogs */
light()

/* CONTROLS */

const keysPressed = {}
let isRun = false

document.addEventListener('keydown', (event) => {
    if (event.shiftKey) {
        isRun = true
    } else {
        (keysPressed)[event.key.toLowerCase()] = true
    }
    setAction(animationActions[2])
    debug()
}, false);
document.addEventListener('keyup', (event) => {
    if (event.shiftKey) {
        isRun = true
    } else {
        isRun = false
    }
    (keysPressed)[event.key.toLowerCase()] = false
    debug()
    setAction(animationActions[0])

}, false);

// Setup animate

const clock = new THREE.Clock()


function animate() {
    requestAnimationFrame(animate)
    orbitControls.update()

    if (modelReady) {
        mixer.update(clock.getDelta())
    }

    render()
}

function render() {

    renderer.render(scene, camera)
}

animate()


/* HELPER FUNCTION FROM https://github.com/tamani-coding/threejs-character-controls-example/tree/main */

function generateFloor() {
    // TEXTURES
    const textureLoader = new THREE.TextureLoader();
    const placeholder = textureLoader.load("./Textures/placeholder.png");

    const WIDTH = 80
    const LENGTH = 80

    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
    const material = new THREE.MeshStandardMaterial(
        {
            map: placeholder
        })
    wrapAndRepeatTexture(material.map)
    // const material = new THREE.MeshPhongMaterial({ map: placeholder})

    const floor = new THREE.Mesh(geometry, material)
    floor.receiveShadow = true
    floor.rotation.x = - Math.PI / 2
    floor.position.y = -5
    scene.add(floor)
}

function wrapAndRepeatTexture(map) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.x = map.repeat.y = 10
}

function light() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(- 60, 100, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 50;
    dirLight.shadow.camera.left = - 50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);
    // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

/* Debug function */
function debug() {

}

