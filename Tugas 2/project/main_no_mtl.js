"use strict";
function clearSelection() {
  if (window.getSelection) {window.getSelection().removeAllRanges();}
  else if (document.selection) {document.selection.empty();}
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
// This is not a full .obj parser.
// see http://paulbourke.net/dataformats/obj/

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let material = 'default';
  let object = 'default';
  let groups = ['default'];

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }


  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      //CLEMENT : LEARNING LOGS
      //console.log(`objIndexStr : ${objIndexStr} \n i : ${i}`);
      //END
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  //TUTORIAL : Ignored words
  const noop = () => { };

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {

      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    mtllib(parts, unparsedArgs) {
      materialLibs.push(unparsedArgs);
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry()
    },
    s: noop,
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
    //console.log(`parts : ${parts} \n unparsedArgs : ${unparsedArgs}`);
  }
  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
      Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    materialLibs,
    geometries,
  };
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }


  // compiles and links the shaders, looks up attribute and uniform locations
  const objectProgramInfo = webglUtils.createProgramInfo(gl, ["object-vertex", "object-fragment"]);
  const skyboxProgramInfo = webglUtils.createProgramInfo(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);

  //GENERATE : Skybox
  const quadBufferInfo = primitives.createXYQuadBufferInfo(gl);

  // Create a texture.
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: '../Daylight Box_Pieces/Daylight Box_Right.bmp',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: '../Daylight Box_Pieces/Daylight Box_Left.bmp',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: '../Daylight Box_Pieces/Daylight Box_Top.bmp',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: '../Daylight Box_Pieces/Daylight Box_Bottom.bmp',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: '../Daylight Box_Pieces/Daylight Box_Front.bmp',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: '../Daylight Box_Pieces/Daylight Box_Back.bmp',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function () {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  //GENERATE : Object
  const response = await fetch('./models/kingdomKey_ps2/KingdomKey.obj');
  const text = await response.text();
  const obj = parseOBJ(text);

  const parts = obj.geometries.map(({ data }) => {
    // Because data is just named arrays like this
    //
    // {
    //   position: [...],
    //   texcoord: [...],
    //   normal: [...],
    // }
    //
    // and because those names match the attributes in our vertex
    // shader we can pass it directly into `createBufferInfoFromArrays`
    // from the article "less code more fun".

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: {
        u_diffuse: [Math.random(), Math.random(), Math.random(), 1],
      },
      bufferInfo,
    };
  });

  const cameraTarget = [0, 50, 0];
  const cameraPosition = [0, 50, 200];
  const zNear = 0.1;
  const zFar = 80;
  let translation = [0, 0, 0];
  let rotation = [degToRad(190), degToRad(40)];
  let scale = [0.5, 0.5, 0.5, 1];
  let anchor = [0, 0, 100];

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  //EVENT LISTENERS
  //Scale - Mouse Wheel
  addEventListener("wheel", (event) => {
    event.preventDefault();
    let deltaY = clamp(event.deltaY, -2, 2);
    scale[0] += deltaY * -0.01;
    scale[1] += deltaY * -0.01;
    scale[2] += deltaY * -0.01;
    requestAnimationFrame(render);
  } ,{passive: false})
  //Translation & Rotation - Mouse buttons
  //DEBUG

  let mouseDown = 0;
  let translate = 0; 
  let rotate = 0;
  const canvasHalfDims = [(canvas.scrollWidth/2), (canvas.scrollHeight/2)];
  let clickPostition = [0,0];
  canvas.addEventListener("mouseup", (e) => {
    --mouseDown;
    if (mouseDown) {
      translate = 0;
      rotate = 0;
    }
    ++mouseDown;
  })
  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    ++mouseDown;
    if (mouseDown) {
      clickPostition[0] = (e.clientX - canvasHalfDims[0]);
      clickPostition[1] = (e.clientY - canvasHalfDims[1]);
      if(e.button == 0){
        translate = 1;
      }
      else if(e.button == 1){
        rotate = 1;
      }
    }
    --mouseDown;
  })
  canvas.addEventListener("mousemove", (e) => {
    if(translate){
      translation[0] -= 5*(clickPostition[0]-(e.clientX - canvasHalfDims[0]))/canvasHalfDims[0];
      translation[1] -= 5*(e.clientY - canvasHalfDims[1] - clickPostition[1])/canvasHalfDims[1]; //Because position 0 is at top of screen
    }
    else if(rotate){
      rotation[0] -= 0.01*(clickPostition[0]-(e.clientX - canvasHalfDims[0]))/canvasHalfDims[0];
      rotation[1] -= 0.01*(e.clientY - canvasHalfDims[1] - clickPostition[1])/canvasHalfDims[1];
    }
  })
  //Animation
  let animRun = 0;
  let start = 0;
  document.addEventListener("keydown", (e) => {
    if(e.key == " "){
      animRun = !animRun;
      anim();
    }
    console.log(animRun);
  })
  function anim() {
    start = performance.now();
  }
  let then = 0;

  requestAnimationFrame(render);

 

  function render(time) {
    time *= 0.001;  // convert to 
    // Subtract the previous time from the current time
    let deltaTime = time - then;
    // Remember the current time for the next frame.
    then = time;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    let projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);
    //SETUP SKYBOX
    var viewDirectionMatrix = m4.copy(view);
    viewDirectionMatrix[12] = 0;
    viewDirectionMatrix[13] = 0;
    viewDirectionMatrix[14] = 0;

    var viewDirectionProjectionMatrix = m4.multiply(
        projection, viewDirectionMatrix);
    var viewDirectionProjectionInverseMatrix =
        m4.inverse(viewDirectionProjectionMatrix);

    //DRAW OBJECT
    //Animation
    if(animRun){
      
      const now = performance.now();
      const delta = Math.min((now - start) / 1000, 1);
      rotation[1] = 0.25;
      if (delta < 1) {
        console.log(delta);
        translation[2] -= (-delta + (1/2))*200; 
        rotation[0] += 0.05;
      }
      else{
        //Reset position
        translation[2] = 50;
        animRun = !animRun;
      }
    }
    //User Translation
    let finalTransform = m4.translation(translation[0], translation[1], translation[2]);
    projection = m4.multiply(projection, finalTransform);
    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_scale: scale,
    };
    
    gl.useProgram(objectProgramInfo.program);

    // calls gl.uniform
    webglUtils.setUniforms(objectProgramInfo, sharedUniforms);

    // compute the world matrix once since all parts
    // are at the same space.
    
    let u_world = m4.yRotation(degToRad(360)*rotation[0]);
    u_world = m4.multiply(u_world, m4.xRotation(degToRad(360)*rotation[1]));

    for (const { bufferInfo, material } of parts) {

      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(gl, objectProgramInfo, bufferInfo);

      // calls gl.uniform
      webglUtils.setUniforms(objectProgramInfo, {
        u_world,
        u_diffuse: material.u_diffuse,
      });

      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }
     //DRAW SKYBOX
    // let our quad pass the depth test at 1.0
    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(skyboxProgramInfo.program);
    webglUtils.setBuffersAndAttributes(gl, skyboxProgramInfo, quadBufferInfo);
    webglUtils.setUniforms(skyboxProgramInfo, {
      u_viewDirectionProjectionInverse: viewDirectionProjectionInverseMatrix,
      u_skybox: texture,
    });
    webglUtils.drawBufferInfo(gl, quadBufferInfo);


    requestAnimationFrame(render);
  }
 

  
}

main();