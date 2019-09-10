//A Simple game framework by inlbe
class GameWorld
{
  //Handles key input, rendering sprites, tweens
  constructor(xTiles, yTiles, tileSize)
  {
    this.canvas = document.createElement("canvas");
    this.canvas.width = tileSize * xTiles;
    this.canvas.height = tileSize * yTiles;
    this.ctx = this.canvas.getContext("2d");
    this.canvas.style.marginLeft = "auto";
    this.canvas.style.marginRight = "auto";
    this.canvas.style.display = "block";
    this.xTiles = xTiles;
    this.yTiles = yTiles;
    document.body.appendChild(this.canvas);
    this.pause = false;
    this.tileSize = tileSize;
    this.children = new Array();
    this.tweens = new Array();
    this.game = null;
    this.timeRef = 0;
    this.renderSprites = new Array();
    this.interval = 0;
    this.collisionGrid = null;
    this.gravity = 0;
    this.events =
    {
      onKeyUp:null,
      onKeyDown:null,
      onMouseDown:null
    };
    this.timers = [];

    document.addEventListener('keydown', (event) =>
    {
      if(this.events.onKeyDown)
      {
        this.events.onKeyDown(event);
      }
      this.renderSprites.forEach((sprite) =>
      {
        if(sprite.events.onKeyDown)
        {
          sprite.events.onKeyDown(event);
        }
      });
    });

    document.addEventListener('keyup', (event) =>
    {
      if(this.events.onKeyUp)
      {
        this.events.onKeyUp(event);
      }
      this.renderSprites.forEach((sprite) =>
      {
        if(sprite.events.onKeyUp)
        {
          sprite.events.onKeyUp(event);
        }
      });
    });
    this.canvas.onmousedown = (event) =>
    {
      let position = this.getMousePos(event);
      this.renderSprites.some((renderSprite) =>
      {
        if(renderSprite.events.onMouseDown &&
            position.x > (renderSprite.centre.x - (renderSprite.scale.x *
            (renderSprite.width / 2))) && position.x <
            (renderSprite.centre.x  + (renderSprite.scale.x *
            (renderSprite.width / 2))) &&
            position.y > (renderSprite.centre.y - (renderSprite.scale.y *
            ((renderSprite.height / 2)))) && position.y <
            (renderSprite.centre.y + (renderSprite.scale.y *
            (renderSprite.height / 2))))
        {
          //sprite clicked
          renderSprite.events.onMouseDown(position);
          return true;
        }
      });
    };

  }
  getMousePos(event)
  {
    let rect = this.canvas.getBoundingClientRect();
    let canvasStyleHeight = parseFloat(this.canvas.style.height.substring(0, this.canvas.style.height.length - 2));
    let canvasStyleWidth = parseFloat(this.canvas.style.width.substring(0, this.canvas.style.width.length - 2));
    let scaleX = canvasStyleWidth / this.canvas.width;
    let scaleY = canvasStyleHeight / this.canvas.height;
    return new Point((event.clientX / scaleX) - rect.left, (event.clientY / scaleY) - rect.top);
  }
  start()
  {
    this.interval = setInterval(this.render.bind(this), 16.666);
    this.timeRef = Date.now();
  }
  stop()
  {
    clearInterval(this.interval);
    this.pause = true;
  }
  clear()
  {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render()
  {
    this.clear();
    let time = Date.now();
    let deltaTime = time - this.timeRef;
    let deltaTimeSec = deltaTime / 1000;
    this.timers.forEach((timer) =>
    {
      timer.update(deltaTimeSec);
    });
    this.timeRef = time;

    this.tweens.forEach((tweenObj) =>
    {
      if(tweenObj.tweens)
      {
        //tween container
        tweenObj.tweens.some((tween) =>
        {
          if(tween.sprite.worldAttribs.worldVisible && tween.active)
          {
            tween.update(deltaTimeSec);
            return true;
          }
        });
      }
      else
      {
        if(tweenObj.sprite.worldAttribs.worldVisible && tweenObj.active)
          {
            tweenObj.update(deltaTimeSec);
            return true;
          }
      }
    });
    //do gravity
    this.renderSprites.forEach((renderSprite) =>
    {
      if(!renderSprite.fixed && renderSprite.active)
      {
        if(renderSprite.gravityEnabled && !renderSprite.collidingY)
        {
          renderSprite.speed.y += this.gravity * deltaTimeSec;
        }
        if(renderSprite.speed.y > renderSprite.maxPosYSpeed)
        {
          renderSprite.speed.y = renderSprite.maxPosYSpeed;
        }
        else if(renderSprite.speed.y < renderSprite.minPosYSpeed)
        {
          renderSprite.speed.y = renderSprite.minPosYSpeed;
        }
      }

    });
    if(this.collisionGrid)
    {
      this.collisionGrid.update();
      this.collisionGrid.checkCollisions(deltaTimeSec);
    }
    this.renderSprites.forEach((renderSprite) =>
    {
      if(!renderSprite.fixed && renderSprite.active)
      {
        if(!renderSprite.collidingX)
        {
          renderSprite.position.x += renderSprite.speed.x * deltaTimeSec;
        }
        if(!renderSprite.collidingY)
        {
          renderSprite.position.y += renderSprite.speed.y * deltaTimeSec;
        }
      }
      renderSprite.calcWorldAttribs();
      renderSprite.calcCentre();

      this.ctx.save();
      this.ctx.translate(renderSprite.worldAttribs.worldPosition.x + renderSprite.width * 0.5,
      renderSprite.worldAttribs.worldPosition.y + renderSprite.height * 0.5);
      this.ctx.rotate(renderSprite.angle);
      this.ctx.scale(renderSprite.worldAttribs.worldScale.x,renderSprite.worldAttribs.worldScale.y);
      this.ctx.globalAlpha = renderSprite.worldAttribs.worldAlpha;
      if(renderSprite.flipX)
      {
        this.ctx.scale(-1, 1);
      }
      if(renderSprite.type === Sprite.Type.SPRITE_SHEET)
      {
        this.ctx.drawImage(renderSprite.spriteSheet.image,renderSprite.frameRectangle.position.x,
            renderSprite.frameRectangle.position.y,renderSprite.frameRectangle.width,
            renderSprite.frameRectangle.height, renderSprite.width * -0.5,
            renderSprite.height * -0.5,
            renderSprite.frameRectangle.width, renderSprite.frameRectangle.height);
      }

      else if(renderSprite.type === Sprite.Type.TEXT)
      {
        this.ctx.font = renderSprite.frame.font;
        this.ctx.fillStyle = renderSprite.frame.fillStyle;
        this.ctx.fillText(renderSprite.frame.text,
        renderSprite.width * -0.5,
        renderSprite.height * 0.5);
      }
      this.ctx.restore();
    });

    this.game.update(deltaTimeSec);
    this.renderSprites.forEach((renderSprite) =>
    {
      if(renderSprite.active)
      {
        renderSprite.update(deltaTimeSec);
      }
    });
  }
  addChild(sprite)
  {
    //Add sprite to the world
    if(sprite.parent)
    {
      sprite.parent.removeChild(sprite);
    }
    this.children.push(sprite);
    sprite.parent = this;
    this.calcRenderOrder();
    sprite.calcWorldAttribs();
    sprite.calcCentre();
    sprite.initGridPos();
    return sprite;
  }
  removeChild(sprite)
  {
    // remove sprite from game world
    this.children.splice(ArrayFunctions.FindObjectIndex(
        this.children, sprite, null), 1);
    this.calcRenderOrder();
  }
  reIndexChild(child, newIndex)
  {
    //move sprite in children array
    ArrayFunctions.MoveObjectTo(this.children,child, newIndex);
    this.calcRenderOrder();
  }
  addTween(tween)
  {
    //add tween to the world
    this.tweens.push(tween);
    return tween;
  }
  removeTween(tween)
  {
    // remove tween from game world
    this.tweens.splice(ArrayFunctions.FindObjectIndex(
    this.tweens, tween, null), 1);
  }

  calcRenderOrder()
  {
    //calculate order sprites are rendered in
    let finished = null;
    this.renderSprites.length = 0;
    let tempSprites = new Array();
    let currentSprite = null;
    for(let i = 0; i < this.children.length; i++)
    {
      if(this.children[i].visible)
      {
        currentSprite = this.children[i];
        tempSprites.push(currentSprite);
        finished = false;
      }
      else
      {
        finished = true;
      }
      while(!finished)
      {
        let renderSpritesDone = true;
        for(let j = currentSprite.renderSearchIndex; j < currentSprite.children.length; j++)
        {
          if(currentSprite.children[j].visible)
          {
            currentSprite.renderSearchIndex = j + 1;
            //move down
            currentSprite = currentSprite.children[j];
            tempSprites.push(currentSprite);
            renderSpritesDone = false;
            break;
          }
        }
        currentSprite.renderSearchIndex = 0;
        if(renderSpritesDone)
        {
          // move up
          if(currentSprite.parent !== this)
          {
            currentSprite = currentSprite.parent;
          }
          else
          {
            finished = true;
            this.renderSprites = this.renderSprites.concat(tempSprites);
            tempSprites.length = 0;
          }
        }
      }
    }
  }
}
class Game
{
  //Your game sublcasses this
  constructor(xTiles, yTiles, tileSize)
  {
    this.gameWorld = new GameWorld(xTiles, yTiles, tileSize);
    this.canvas = this.gameWorld.canvas;
    this.ctx = this.gameWorld.ctx;
    this.spriteSheets = [];
    this.imageLoadIndex = 0;
    this.oldCanvasWidth = this.canvas.width;
    this.oldCanvasHeight = this.canvas.height;
  }
  addSpriteSheet(spriteSheet)
  {
    this.spriteSheets.push(spriteSheet);
  }
  measureTextWidth(frame)
  {
    let oldFont = this.gameWorld.ctx.font;
    this.gameWorld.ctx.font = frame.font;
    let width = this.gameWorld.ctx.measureText(frame.text).width;
    this.gameWorld.ctx.font = oldFont;
    return width;
  }
  loadSpriteSheets()
  {
    let nextSpriteSheet = () =>
    {
      let pad = 2;
      if(this.spriteSheets[this.imageLoadIndex])
      {
        let spriteSheet = this.spriteSheets[this.imageLoadIndex];
        this.gameWorld.clear();
        let rows = spriteSheet.rows;
        let spriteSheetRectangles = [];
        this.canvas.width = (rows * spriteSheet.spriteWidth) + (pad * rows);
        let cols = Math.ceil(spriteSheet.spriteShapes.length / rows);
        this.canvas.height = (cols * spriteSheet.spriteHeight) + (pad * cols);
        let colNum = 0;
        let rowNum = -1;
        spriteSheet.spriteShapes.forEach((spriteShape, index) =>
        {
          if(index / rows === colNum + 1)
          {
            colNum ++;
            rowNum = 0;
          }
          else
          {
            rowNum ++;
          }
          spriteShape.forEach((element) =>
          {
            this.ctx.save();
            CanvasFunctions.DrawPolygon(this.ctx,(rowNum * spriteSheet.spriteWidth) + (pad * rowNum),
                (colNum * spriteSheet.spriteHeight) + (pad * colNum),
                element.points, element.fillStyle,
                element.strokeStyle, element.lineWidth);
            this.ctx.restore();
            if(element.name)
            {
              spriteSheetRectangles.push(new Rectangle(new Point((rowNum * spriteSheet.spriteWidth) + (pad * rowNum),
                  (colNum * spriteSheet.spriteWidth) + (pad * colNum)),
                  spriteSheet.spriteWidth, spriteSheet.spriteHeight, element.name));
            }
          });
        });
        spriteSheet.image.src = this.canvas.toDataURL("image/png");
        spriteSheet.rectangles = spriteSheetRectangles;
        spriteSheet.image.onload = () =>
        {
          if(this.imageLoadIndex < this.spriteSheets.length - 1)
          {
            this.imageLoadIndex ++;
            nextSpriteSheet();
          }
          else
          {
            this.canvas.width = this.oldCanvasWidth;
            this.canvas.height = this.oldCanvasHeight;
            this.create();
          }
        }
      }
    };
    this.oldCanvasWidth = this.canvas.width;
    this.oldCanvasHeight = this.canvas.height;
    this.imageLoadIndex = 0;
    nextSpriteSheet();
  }
  preload()
  {

  }
  create()
  {
    //initialise game objects here
    this.gameWorld.game = this;
  }
  update(deltaTime)
  {

  }
}
class MathsFunctions
{
  static RandomInt(min, max)
  {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
  }
  static RandomIntInclusive(min, max)
  {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
  }
  static RandomFloat(min, max)
  {
    return Math.random() * (max - min) + min;
  }
  static RotateVertices(vertices, origin, angle)
  {
    let rotatedVertices = new Array();
    let vertAngle = 0;
    let vertLength = 0;
    for(let i = 0; i < vertices.length; i++)
    {
      vertAngle = Math.atan2(vertices[i].y - origin.y, vertices[i].x - origin.x);
      vertLength = Math.sqrt(Math.pow(vertices[i].x - origin.x, 2) + Math.pow(vertices[i].y - origin.y, 2));
      rotatedVertices.push(new Point((Math.cos(angle + vertAngle) * vertLength) + origin.x,
          (-Math.sin(angle + vertAngle) * vertLength) + origin.y));
    }
    return rotatedVertices;
  }
  static DisSq(point1, point2)
  {
    //distance squared
    return Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2);
  }
  static Dis(point1, point2)
  {
    //distance
    return Math.sqrt(MathsFunctions.DisSq(point1, point2));
  }
}
class ArrayFunctions
{
  static FindArrayMaxIndex(array, callback)
  {
    let maxVal = 0;
    let index = -1;
    let member = null;
    for(let i = 0; i < array.length; i++)
    {
      if(callback)
      {
        member = callback(array[i], i);
        if(member > maxVal)
        {
          maxVal = member;
          index = i;
        }
      }
      else
      {
        if(array[i] < maxVal)
        {
          maxVal = array[i];
          index = i;
        }
      }
    }
    return index;
  }
  static FindAllObjectIndexes(array, object, memberCallback)
  {
    let foundIndexes = [];

    array.forEach((element, index) =>
    {
      if(memberCallback && memberCallback(element) === object)
      {
        foundIndexes.push(index);
      }
      else if(element === object)
      {
        foundIndexes.push(index);
      }
    });

    return foundIndexes;
  }
  static FindAllObjects(array, object, memberCallback)
  {
    let foundIndexes = ArrayFunctions.FindAllObjectIndexes(array, object, memberCallback);
    let foundObjects = [];
    foundIndexes.forEach((element) =>
    {
      foundObjects.push(array[element]);
    });
    return foundObjects;
  }
  static FindObjectIndex(array, object, memberCallback = null)
  {
    let index = -1;
    let found = false;
    if(memberCallback)
    {
      index = array.findIndex((element) =>
      {
        if(memberCallback(element) === object)
        {
          found = true;
        }
        return found;
      });
    }
    else
    {
      index = array.findIndex((element) =>
      {
        if(element === object)
        {
          found = true;
        }
        return found;
      });
    }
    return index;
  }
  static FindObject(array, object, memberCallback)
  {
    let index = ArrayFunctions.FindObjectIndex(array, object, memberCallback);
    return array[index];
  }
  static MoveObjectTo(array, object, newIndex)
  {
    //move object index to new index
    let currentIndex = ArrayFunctions.FindObjectIndex(array, object, null);
    array.splice(currentIndex, 1);//remove from old pos
    array.splice(newIndex, 0, object);
  }
}

class Point
{
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
  }
  compare(another)
  {
    if(another)
    {
      if(another.x === this.x && another.y === this.y)
      {
        return true;
      }
      else
      {
        return false;
      }
    }
    else
    {
      return false;
    }
  }
  setTo(another)
  {
    this.x = another.x;
    this.y = another.y;
  }
  add(another)
  {
    if(another)
    {
      this.x += another.x;
      this.y += another.y;
    }
  }
  addNew(another)
  {
    //add and return a new point
    return new Point(this.x + another.x, this.y + another.y);
  }
}
class Rectangle
{
  constructor(position, width, height, name)
  {
    this.position = position;
    this.width = width;
    this.height = height;
    this.name = name;
  }
}
class Pool
{
  //object pool class
  constructor()
  {
    this._pool = new Array();
  }
  free(object)
  {
    object.reset();
    this._pool.push(object);
  }
  freeAll(objects)
  {
    for(let i = 0; i < objects.length; i++)
    {
      this.free(objects[i]);
    }
  }
  obtain(objectArgs)
  {
    let returnObj = null;
    if(this._pool.length > 0)
    {
      returnObj = this._pool[this._pool.length - 1];
      returnObj.set(objectArgs);
      this._pool.splice(this._pool.length - 1, 1);
    }
    else
    {
      //create new object
      returnObj = this.newObject(objectArgs);
    }
    return returnObj;
  }
  newObject(objectArgs)
  {
    //override me
    return {};
  }
}


class SpriteSheet
{
  constructor(rows, spriteWidth, spriteHeight, spriteShapes)
  {
    this.image = document.createElement("img"); //spritesheet image
    this.rectangles = null;
    this.rows = rows;
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.spriteShapes = spriteShapes;
  }
}

class Sprite
{
  //sprite class
  static get Type()
  {
    return {SPRITE_SHEET: 0, TEXT: 1};
  }
  static get CollisionID()
  {
    return 0;
  }
  constructor(game,type,frames, x, y, fixed, animated, spriteSheet = game.spriteSheets[0])
  {
    this.active = true;
    this.game = game;
    this.type = type;
    this.frameRectangles = new Array();
    this.frames = null;
    this.frame = null;
    this.frameIndex = 0;
    this.spriteSheet = spriteSheet;
    this.width = spriteSheet.spriteWidth;
    this.height = spriteSheet.spriteHeight;
    this.collisionWidth = this.width;
    this.collisionHeight = this.height;
    this.frameRectangle = null;
    this._setFrames(type, frames);
    this.gravityEnabled = false;
    this.maxPosYSpeed = Number.MAX_SAFE_INTEGER;
    this.minPosYSpeed = Number.MIN_SAFE_INTEGER;
    this.onlyCollidesTop = false;
    this.flipX = false;

    if(fixed)
    {
      this.fixed = fixed;
    }
    else
    {
      this.fixed = false;
    }
    this.position = new Point(x, y);
    this.speed = new Point(0, 0);

    this.centre = new Point(0, 0);
    this.children = new Array(); //this.children sprites
    this.parent = null;
    this.visible = true;
    this.events =
    {
      onKeyUp:null,
      onKeyDown:null,
      onMouseDown: null
    };
    this.angle = 0;
    this.scale = new Point(1, 1);
    this.renderSearchIndex = 0; //used when determining render order
    this.animRate = 1 / 20;
    if(animated)
    {
      this.animated = animated;
    }
    else
    {
      this.animated = false;
    }
    this.animTime = 0;
    this.alpha = 1;
    this.gridPos = new Point(0, 0);
    this.collidingX = false;
    this.collidingY = false;
    this.collisionGroup = null;
    this.onCollide = new Signal(game, this);
    this.onGridPosChanged = new Signal(game, this);
    this.health = 100;
    this.worldAttribs =
    {
      worldPosition : new Point(1, 1),
      worldScale : new Point(1, 1),
      worldAlpha : 1,
      worldVisible: false
    };
    this.calcCentre();
    this.solid = true;
  }
  initGridPos()
  {
    this.gridPos.x = Math.floor(Math.floor(this.position.x / this.game.gameWorld.tileSize)),
    this.gridPos.y = Math.floor(Math.floor(this.position.y / this.game.gameWorld.tileSize));
  }
  calcWorldAttribs()
  {
    this.worldAttribs.worldPosition.setTo(this.position);
    this.worldAttribs.worldScale.setTo(this.scale);
    this.worldAttribs.worldAlpha = this.alpha;
    this.worldAttribs.worldVisible = this.visible;
    let spriteParent = this.parent;
    while(spriteParent !== this.game.gameWorld && spriteParent)
    {
      this.worldAttribs.worldPosition.x += spriteParent.position.x;
      this.worldAttribs.worldPosition.y += spriteParent.position.y;
      this.worldAttribs.worldScale.x *= spriteParent.scale.x;
      this.worldAttribs.worldScale.y *= spriteParent.scale.y;
      this.worldAttribs.worldAlpha *= spriteParent.alpha;
      if(this.worldAttribs.worldVisible && !spriteParent.visible)
      {
        this.worldAttribs.worldVisible = false;
      }
      spriteParent = spriteParent.parent;
      if(this.worldAttribs.worldVisible && !spriteParent)
      {
        this.worldAttribs.worldVisible = false;
      }
    }
  }
  _setFrames(type = Sprite.Type.SPRITE_SHEET, frames = [])
  {
    if(Array.isArray(frames))
    {
      this.frames = frames;
    }
    else
    {
      this.frames = [frames];
    }
    this.frame = this.frames[0];
    this.frameRectangle = null;
    if(type === Sprite.Type.SPRITE_SHEET)
    {
      this._setFrameRectangles();
    }
    else if(type === Sprite.Type.TEXT)
    {
      //get width of text
      this.width = this.game.measureTextWidth(this.frame);
    }
  }
  _setFrameRectangles()
  {
    for(let i = 0; i < this.frames.length; i++)
    {
      this.frameRectangles.push(
          ArrayFunctions.FindObject(this.spriteSheet.rectangles,
          this.frames[i], (element) => {return element.name;}));
    }
    this.frameRectangle = this.frameRectangles[0];
  }
  _playAnim(deltaTimeSec)
  {
    this.animTime += deltaTimeSec;
    if(this.animTime > this.animRate)
    {
      //set next frame;
      this.animTime = 0;
      if(this.frameIndex < this.frames.length - 1)
      {
        this.frameIndex ++;
      }
      else
      {
        this.frameIndex = 0;
      }
      this.frame = this.frames[this.frameIndex];
      this.frameRectangle = this.frameRectangles[this.frameIndex];
    }
  }
  setFrame(frameIndex)
  {
    this.frameIndex = frameIndex;
    this.frame = this.frames[this.frameIndex];
    this.frameRectangle = this.frameRectangles[this.frameIndex];
  }
  update(deltaTimeSec)
  {
    if(this.animated)
    {
      this._playAnim(deltaTimeSec);
    }
  }
  setGridPos(newGridPos)
  {
    this.gridPos.setTo(newGridPos);
  }
  setVisible(visible)
  {
    this.visible = visible;
    this.game.gameWorld.calcRenderOrder();
    this.calcWorldAttribs();
  }
  calcCentre()
  {
    //NOTE: THIS IS THE WORLD CENTRE POSITION
    this.centre.x = this.worldAttribs.worldPosition.x + (this.width * 0.5);
    this.centre.y = this.worldAttribs.worldPosition.y + (this.height * 0.5);
  }
  addChild(child)
  {
    if(child.parent)
    {
      child.parent.removeChild(child);
    }
    this.children.push(child);
    child.parent = this;
    this.game.gameWorld.calcRenderOrder();
    child.calcWorldAttribs();
    child.calcCentre();
    child.initGridPos();
    return child;
  }
  addChildren(children)
  {
    children.forEach((child) =>
    {
      this.addChild(child);
    });
  }
  removeChild(child)
  {
    let index = -1;
    index = this.children.findIndex((element) =>
    {
      if(element === child)
      {
        return true;
      }
      else
      {
        return false;
      }
    });
    if(index >= 0)
    {
      this.children.splice(index, 1);
      child.parent = null;
    }
    this.game.gameWorld.calcRenderOrder();
  }
  removeChildren(children)
  {
    children.forEach((child) =>
    {
      this.removeChild(child);
    });
  }
  removeAllChildren()
  {
    this.children.forEach((child) =>
    {
      child.parent = null;
    });
    this.children.length = 0;
    this.game.gameWorld.calcRenderOrder();
  }
  reset()
  {
    //reset object when put into pool
    this.position.x = 0;
    this.position.y = 0;
    this.speed.x = 0;
    this.speed.y = 0;
    this.angle = 0;
  }
  set(objectArgs)
  {
    //set obtained objects
    if(objectArgs.x)
    {
      this.position.x = objectArgs.x;
    }
    else
    {
      this.position.x = 0;
    }
    if(objectArgs.y)
    {
      this.position.y = objectArgs.y;
    }
    else
    {
      this.position.y = 0;
    }
    if(objectArgs.frames)
    {
      this.frameRectangles.length = 0;
      this._setFrames(objectArgs.type, objectArgs.frames);
    }
    if(objectArgs.fixed)
    {
      this.fixed = objectArgs.fixed;
    }
    else
    {
      this.fixed = false;
    }
    this.calcCentre();
    this.initGridPos();
  }
}

class SpritePool extends Pool
{
  constructor()
  {
    super();
  }
  newObject(objectArgs)
  {
    return new Sprite(objectArgs.game, objectArgs.type, objectArgs.frames,
        objectArgs.x, objectArgs.y, objectArgs.fixed, objectArgs.animated);
  }
}

class WallSprite extends Sprite
{
  static get CollisionID()
  {
    return 1;
  }
  constructor(game, frames, x, y, animated)
  {
    super(game, Sprite.Type.SPRITE_SHEET, frames, x, y, true, animated);
  }
}

class WallSpritePool extends Pool
{
  constructor()
  {
    super();
  }
  newObject(objectArgs)
  {
    return new WallSprite(objectArgs.game, objectArgs.frames, objectArgs.x,
        objectArgs.y, objectArgs.animated);
  }
}


class TileMap extends Sprite
{
  constructor(game)
  {
    super(game, null, null, 0, 0, true, false);
    this.tileSprites = [];
    this.wallSpritePool = new WallSpritePool();
    this.wallSprites = [];
    this.backgroundSprites = [];
    this.backgroundSpritePool = new SpritePool();
  }
  clearTileSprites(collisionGrid = null)
  {
    if(collisionGrid)
    {
      collisionGrid.removeSprites(this.wallSprites, true);
    }
    this.wallSprites.forEach((sprite) =>
    {
      this.removeChild(sprite);
    });
    this.wallSpritePool.freeAll(this.wallSprites);
    this.wallSprites.length = 0;
    this.backgroundSprites.forEach((sprite) =>
    {
      this.removeChild(sprite);
    });
    this.backgroundSpritePool.freeAll(this.backgroundSprites);
    this.backgroundSprites.length = 0;

  }
  createTileSprites(mapData, collisionGrid = null)
  {
    for(let x = 0; x < mapData.xDim; x++)
    {
      for(let y = 0; y < mapData.yDim; y++)
      {
        if(mapData.grid[x][y].wall)
        {
          let wallSprite = this.wallSpritePool.obtain({game: this.game, frames: mapData.grid[x][y].frames,
              x: x * this.game.gameWorld.tileSize, y: y * this.game.gameWorld.tileSize,
              animated: mapData.grid[x][y].animated});

          wallSprite.animRate = mapData.grid[x][y].animRate;
          wallSprite.onlyCollidesTop = mapData.grid[x][y].onlyCollidesTop;

          this.addChild(wallSprite);
          this.tileSprites.push(wallSprite);
          this.wallSprites.push(wallSprite);
        }
        else if(mapData.grid[x][y].frames.length > 0)
        {
          let tileSprite = new Sprite(this.game, Sprite.Type.SPRITE_SHEET, mapData.grid[x][y].frames,
              x * this.game.gameWorld.tileSize, y * this.game.gameWorld.tileSize, true, false);
          this.addChild(tileSprite);
          this.tileSprites.push(tileSprite);
        }
      }
    }
    if(collisionGrid)
    {
      collisionGrid.setTileMapWalls(mapData);
      this.wallSprites.forEach((wallSprite) =>
      {
        collisionGrid.addSprite(wallSprite);
      });
    }
  }
  setWallSpriteCollisionGroups(collisionGroup)
  {
    this.wallSprites.forEach((sprite) =>
    {
      sprite.collisionGroup = collisionGroup;
    });
  }
}

class TextFrame
{
  constructor(font, text, fillStyle)
  {
    this.font = font;
    this.text = text;
    this.fillStyle = fillStyle;
  }
}
class TweenContainer
{
  //used for storing tweens so they can be chained
  constructor()
  {
    this.tweens = new Array();
  }
  addTween(tween)
  {
    this.tweens.push(tween);
    return tween;
  }
  removeTween(tween)
  {
    this.tweens.splice(ArrayFunctions.FindObjectIndex(this.tweens, tween, null), 1);
  }
  activateTweens()
  {
    this.tweens.forEach((tween) =>
    {
      tween.active = true;
    });
  }
}
class Tween
{
  static get CONST_SPEED()
  {
    return 1;
  }
  static get CONST_ACCEL()
  {
    return 2;
  }
  constructor(sprite, duration, repeats, type)
  {
    this.sprite = sprite;
    this.duration = duration;
    if(type)
    {
      this.type = type;
    }
    else
    {
      this.type = Tween.CONST_SPEED;
    }
    this.onComplete = null;
    this.repeats = repeats;// negative value means infinite repeats
    this._repeatsCounter = repeats;
    this.amountComplete = 0; //range between 0-1.  1 = complete
    this.travel = null;
    this.onReachedEnd = null;
    this.onReachedStart = null;
    this.active = false;
    this._totalTime = 0;
    this._initSpeed = null;
    this.outbound = true;
    this.averageTravelSpeed = 0;
    this.travelDistance = 0;
    this.acceleration = 0;
  }

  setStartEnd(start, end)
  {

  }

  setDuration(duration)
  {
    if(duration)
    {
      this.duration = duration;
    }
  }

  setAcceleration()
  {
    this.acceleration = (2 * this.travelDistance) / Math.pow(this.duration, 2);
    this._initSpeed = this.acceleration * this.duration;
    this.acceleration *= -1; //make negative
  }
  _updateAmountComplete(deltaTime)
  {
    this._totalTime += deltaTime;
    if(this._totalTime > this.duration)
    {
      this._totalTime = this.duration;
    }

    if(this.type === Tween.CONST_SPEED)
    {
      this.amountComplete = ((this._totalTime * this.averageTravelSpeed) /
          this.travelDistance);
    }
    else if(this.type === Tween.CONST_ACCEL)
    {
      this.amountComplete = (((this._initSpeed * this._totalTime) +
          (0.5 * this.acceleration * Math.pow(this._totalTime, 2))) / this.travelDistance);
    }

    if(!this.outbound)
    {
      this.amountComplete = 1 - this.amountComplete;
    }

    if(this._totalTime === this.duration)
    {
      this._totalTime = 0;
      this.update(0);
      if(!this._checkComplete())
      {
        if(this.outbound)
        {
          this.outbound = false;

          if(this.onReachedEnd)
          {
            this.onReachedEnd();
          }

        }
        else
        {
          this.outbound = true;

          if(this.onReachedStart)
          {
            this.onReachedStart();
          }

        }
      }
    }
  }
  _checkComplete()
  {
    if(this.repeats >= 0)
    {
      this._repeatsCounter --;
      if(this._repeatsCounter < 0)
      {
        //reset tween
        this.reInit();

        if(this.onComplete)
        {
          this.onComplete(this);
        }

        return true;
      }
      return false;
    }
    return false;
  }
  reInit()
  {
    this.active = false;
    this._repeatsCounter = this.repeats;
    this.outbound = true;
    this.amountComplete = 0;
    this._totalTime = 0;
  }
  update(deltaTimeSec)
  {
    if(this.active && deltaTimeSec)
    {
      this._updateAmountComplete(deltaTimeSec);
    }
  }
}
class PointsTween extends Tween
{
  constructor(sprite, duration, repeat,type, startPoint, endPoint)
  {
    //for tweening between points
    super(sprite, duration, repeat,type);
    this.diffX = 0;
    this.diffY = 0;
    this.startPoint = new Point(0,0);
    this.endPoint = new Point(0,0);
    this.setStartEnd(startPoint, endPoint);
  }
  update(deltaTime)
  {
    super.update(deltaTime);
  }
  setStartEnd(startPoint, endPoint)
  {
    this.startPoint.setTo(startPoint);
    this.endPoint.setTo(endPoint);
    this.diffX = this.endPoint.x - this.startPoint.x;
    this.diffY = this.endPoint.y - this.startPoint.y;
    this.travelDistance = MathsFunctions.Dis(this.startPoint, this.endPoint);
    this.setDuration(null);
    this.setAcceleration();
  }
  setDuration(duration)
  {
    super.setDuration(duration);
    this.averageTravelSpeed = this.travelDistance / this.duration;
  }
}
class MoveTween extends PointsTween
{
  constructor(sprite, duration, repeat,type, startPoint, endPoint)
  {
    //for tweening between positions
    super(sprite, duration, repeat,type, startPoint, endPoint);
  }
  update(deltaTime)
  {
    super.update(deltaTime);
    if(this.active)
    {
      this.sprite.position.x = this.startPoint.x + (this.amountComplete * this.diffX);
      this.sprite.position.y = this.startPoint.y + (this.amountComplete * this.diffY);
    }
  }
}
class ScaleTween extends PointsTween
{
  constructor(sprite, duration, repeat,type, startPoint, endPoint)
  {
    super(sprite, duration, repeat,type, startPoint, endPoint);
  }
  update(deltaTime)
  {
    super.update(deltaTime);
    if(this.active)
    {
      this.sprite.scale.x = this.startPoint.x + (this.amountComplete * this.diffX);
      this.sprite.scale.y = this.startPoint.y + (this.amountComplete * this.diffY);
    }
  }
}
class RotateTween extends Tween
{
  constructor(sprite, duration, repeat,type, rotateBy)
  {
    super(sprite, duration, repeat,type);
    this.startAngle = 0;
    this.endAngle = 0;
    this.rotateBy = 0;
    this.setStartEnd(sprite.angle, rotateBy);
  }
  update(deltaTimeSec)
  {
    super.update(deltaTimeSec);
    if(this.active)
    {
      this.sprite.angle = this.startAngle + (this.amountComplete * this.rotateBy);
    }
  }
  setStartEnd(start, rotateBy)
  {
    this.startAngle = start;
    this.rotateBy = rotateBy;
    this.endAngle = this.startAngle + rotateBy;
    this.travelDistance = this.rotateBy;
    this.setDuration(null);
    this.setAcceleration();
  }
  setDuration(duration)
  {
    super.setDuration(duration);
    this.averageTravelSpeed = this.rotateBy / this.duration;
  }
}
class AlphaTween extends Tween
{
  //tween a sprites alpha value
  constructor(sprite, duration, repeat,type, startAlpha, endAlpha)
  {
    super(sprite, duration, repeat, type);
    this.startAlpha = 0;
    this.endAlpha = 0;
    this.setStartEnd(startAlpha, endAlpha);
  }
  setStartEnd(startAlpha, endAlpha)
  {
    this.startAlpha = startAlpha;
    this.endAlpha = endAlpha;
    this.travelDistance = endAlpha - startAlpha;
    this.setDuration(null);
    this.setAcceleration();
  }
  setDuration(duration)
  {
    super.setDuration(duration);
    this.averageTravelSpeed = this.travelDistance / this.duration;
  }
  update(deltaTimeSec)
  {
    super.update(deltaTimeSec);
    if(this.active)
    {
      this.sprite.alpha = this.startAlpha + (this.amountComplete * this.travelDistance);
    }
  }
}

class CanvasFunctions
{
  //for drawing onto canvas
  static DrawPolygon(ctx,x, y, points, fillStyle, strokeStyle,lineWidth)
  {
    if(!x)
    {
      x = 0;
    }
    if(!y)
    {
      y = 0;
    }
    if(fillStyle)
    {
      ctx.fillStyle = fillStyle;
    }
    if(strokeStyle)
    {
      ctx.strokeStyle = strokeStyle;
    }
    if(lineWidth)
    {
      ctx.lineWidth = lineWidth;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x + x, points[0].y + y);
    for(let i = 1; i < points.length; i++)
    {
      ctx.lineTo(points[i].x + x, points[i].y + y);
      if(!fillStyle)
      {
        ctx.stroke();
      }
    }
    ctx.closePath();
    if(fillStyle)
    {
      ctx.fill();
    }
  }
}
class PolyShape
{
  //simple shapes
  constructor(points, name = '', fillStyle = null, strokeStyle = null, lineWidth = null)
  {
    this.points = points;
    this.name = name;
    this.fillStyle = fillStyle;
    this.strokeStyle = strokeStyle;
    this.lineWidth = lineWidth;
  }
  static Circle(x, y, radius, fillStyle = null, name = '', points = 100, startAngle = 0,
      endAngle = 0, strokeStyle = null, lineWidth = null)
  {
    if(!name)
    {
      name = "circle";
    }
    if(!startAngle)
    {
      startAngle = 0;
    }
    if(!endAngle)
    {
      endAngle = Math.PI * 2;
    }
    if(!points)
    {
      points = 100;
    }
    let circlePoints = new Array();
    let pointAngle = ((endAngle - startAngle) / points);
    for(let i = 0; i < points; i++)
    {
      circlePoints[i] = new Point((Math.cos((i * pointAngle) + startAngle) * radius) + radius + x,
          (-Math.sin((i * pointAngle) + startAngle) * radius) + radius + y);
    }
    return new PolyShape(circlePoints, name, fillStyle, strokeStyle, lineWidth);
  }
  static Rectangle(x, y, width, height, name, fillStyle, strokeStyle = null, lineWidth = null)
  {
    let rectPoints = [new Point(x, y), new Point(x + width, y),
        new Point(x + width, y + height), new Point(x, y + height),
        new Point(x, y)];
    return new PolyShape(rectPoints, name, fillStyle, strokeStyle, lineWidth);
  }
}

class MyGrid
{
  constructor(xDim, yDim, fillWith = null)
  {
    let fill = null;
    if(typeof fillWith === 'object')
    {
      fill = ((value, grid, x) =>
      {
        grid[x].push(JSON.parse(JSON.stringify(value)));
      });
    }
    else
    {
      fill = ((value, grid, x) =>
      {
        grid[x].push(value);
      });
    }
    this.grid = [];
    this.xDim = xDim;
    this.yDim = yDim;
    for(let x = 0; x < xDim; x ++)
    {
      let row = [];
      this.grid.push(row);
      for(let y = 0; y < yDim; y++)
      {
        fill(fillWith, this.grid, x);
      }
    }
    this.length = xDim * yDim;
    this.all = this._getAll()
  }
  getAll()
  {
    return this.all;
  }
  _getAll()
  {
    let all = [];
    for(let i = 0; i < this.length; i++)
    {
      all.push(this._get(i));
    }
    return all;
  }
  _get(n)
  {
    let y = Math.floor(n / this.xDim);
    let x = n - (y * this.xDim);
    return {obj: this.grid[x][y], x: x, y: y};
  }
  setAll(value)
  {

    this.getAll().forEach((cell) =>
    {
      this.grid[cell.x][cell.y] = value;
    });
  }
}

class CollisionGrid extends MyGrid
{
  constructor(game, xDim, yDim)
  {
    super(xDim, yDim, {sprites: [], wall: false});
    this.game = game;
  }
  setTileMapWalls(tileMapData)
  {
    tileMapData.getAll().forEach((cell) =>
    {
      if(cell.obj.wall)
      {

        this.grid[cell.x][cell.y].wall = true;
      }
    });
  }
  addSprite(sprite)
  {
    let gridPos = this._calculateSpriteGridPos(sprite);
    this.grid[gridPos.x][gridPos.y].sprites.push(sprite);
  }
  addSprites(sprites)
  {
    sprites.forEach((sprite) =>
    {
      this.addSprite(sprite);
    });
  }
  removeSprite(sprite, wall = false)
  {
    return this.getAll().some((cell) =>
    {
      if(cell.obj.sprites.some((arraySprite, index) =>
          {
            if(arraySprite === sprite)
            {
              cell.obj.sprites.splice(index, 1);
              if(wall)
              {
                cell.obj.wall = false;
              }
              return true;
            }
          }))
      {
        return true;
      }
    });
  }
  removeSprites(sprites, wall = false)
  {
    sprites.forEach((sprite) =>
    {
      this.removeSprite(sprite, wall);
    });
  }
  update()
  {
    let toMove = [];
    this.getAll().forEach((cell) =>
    {
      cell.obj.sprites.forEach((sprite)=>
      {
        if(!sprite.fixed)
        {
          let oldGridPos = new Point(cell.x, cell.y);
          let newGridPos = this._calculateSpriteGridPos(sprite);

          if(!newGridPos.compare(oldGridPos))
          {
            toMove.push({sprite: sprite, oldGridPos: oldGridPos,
                newGridPos: newGridPos});
          }
        }
      });
    });
    //remove old grid pos
    toMove.forEach((obj) =>
    {
      let index = ArrayFunctions.FindObjectIndex(this.grid[obj.oldGridPos.x][obj.oldGridPos.y].sprites, obj.sprite, null);
      this.grid[obj.oldGridPos.x][obj.oldGridPos.y].sprites.splice(index, 1);
    });
    //add new grid pos
    toMove.forEach((obj) =>
    {
      this.grid[obj.newGridPos.x][obj.newGridPos.y].sprites.push(obj.sprite);
      obj.sprite.setGridPos(obj.newGridPos);
      obj.sprite.onGridPosChanged.dispatch();
    });

  }
  checkCollisions(deltaTime)
  {
    this.getAll().forEach((cell) =>
    {
      cell.obj.sprites.forEach((sprite) =>
      {
        sprite.collidingX = false;
        sprite.collidingY = false;
      });
    });
    this.getAll().forEach((cell) =>
    {
      cell.obj.sprites.forEach((sprite) =>
      {
        //check this cell and all surrounding cells for this sprite
        if(sprite.worldAttribs.worldVisible)
        {
          this._collidesWith(sprite, cell.x, cell.y, false, deltaTime);
        }
      });
    });
  }
  collisionTest(sprite)
  {
    return this._collidesWith(sprite, Math.floor(sprite.position.x / this.game.gameWorld.tileSize),
        Math.floor(sprite.position.y / this.game.gameWorld.tileSize), true);
  }
  _collidesWith(sprite, gridX, gridY,testing = false, deltaTime = 0, )
  {
    let calcXCentre = ((sprite, next) =>
    {
      let add = 0;
      if(next && !sprite.collidingX)
      {
        add = sprite.speed.x * deltaTime;
      }
      return sprite.position.x + add + (sprite.width / 2);
    });
    let calcYCentre = ((sprite, next) =>
    {
      let add = 0;
      if(next && !sprite.collidingY)
      {
        add = sprite.speed.y * deltaTime;
      }
      return sprite.position.y + add + (sprite.height / 2);
    });
    let collided = false;
    let checkSpriteCentres = [];
    let spriteCentres = [];
    let colDisX = 0;
    let colDisY = 0;
    let colWidth = 0;
    let colHeight = 0;
    spriteCentres.push(new Point(calcXCentre(sprite, true),calcYCentre(sprite, false)));
    spriteCentres.push(new Point(calcXCentre(sprite, false),calcYCentre(sprite, true)));
    let startX = gridX - 3;
    if(startX < 0)
    {
      startX = 0;
    }
    let endX = gridX + 3;
    if(endX > this.xDim)
    {
      endX = this.xDim;
    }
    let startY = gridY - 3;
    if(startY < 0)
    {
      startY = 0;
    }
    let endY = gridY + 3;
    if(endY > this.yDim)
    {
      endY = this.yDim;
    }

    for(let x = startX; x < endX; x++)
    {
      for(let y = startY; y < endY; y++)
      {
        this.grid[x][y].sprites.forEach((checkSprite) =>
        {
          if(checkSprite.worldAttribs.worldVisible && checkSprite !== sprite &&
              (checkSprite.constructor.CollisionID & sprite.collisionGroup))
          {
            if(checkSprite.onlyCollidesTop || sprite.onlyCollidesTop)
            {
              let checkSpriteCentre = new Point(calcXCentre(checkSprite, false),calcYCentre(checkSprite, true));
              colDisX = checkSpriteCentre.x - spriteCentres[1].x;
              let refSprite1 = null;
              let refSprite2 = null;
              if(checkSprite.onlyCollidesTop)
              {
                colDisY = checkSpriteCentre.y - spriteCentres[1].y;
                refSprite1 = sprite;
                refSprite2 = checkSprite;
              }
              else
              {
                colDisY = spriteCentres[1].y - checkSpriteCentre.y;
                refSprite1 = checkSprite;
                refSprite2 = sprite;
              }
              colWidth = (checkSprite.collisionWidth / 2) + (sprite.collisionWidth / 2);
              colHeight = (checkSprite.collisionHeight / 2) + (sprite.collisionHeight / 2);
              if(Math.abs(colDisX) < colWidth && colDisY < colHeight
                  && refSprite2.position.y - refSprite1.position.y > refSprite1.collisionHeight)
              {
                collided = true;
                if(sprite.solid)
                {
                  checkSprite.collidingY = true;
                }
              }
            }
            else
            {
              checkSpriteCentres.length = 0;
              checkSpriteCentres.push(new Point(calcXCentre(checkSprite, true),calcYCentre(checkSprite, false)));
              checkSpriteCentres.push(new Point(calcXCentre(checkSprite, false),calcYCentre(checkSprite, true)));
              collided = false;
              for(let i = 0; i < 2; i++)
              {
                colDisX = checkSpriteCentres[i].x - spriteCentres[i].x;
                colDisY = checkSpriteCentres[i].y - spriteCentres[i].y;
                colWidth = (checkSprite.collisionWidth / 2) + (sprite.collisionWidth / 2);
                colHeight = (checkSprite.collisionHeight / 2) + (sprite.collisionHeight / 2);


                if(Math.abs(colDisX) < colWidth && Math.abs(colDisY) < colHeight)
                {
                  collided = true;
                  if(!testing)
                  {
                    if(i === 0)
                    {
                      if(sprite.solid)
                      {
                        checkSprite.collidingX = true;
                      }
                    }
                    else
                    {
                      if(sprite.solid)
                      {
                        checkSprite.collidingY = true;
                      }
                    }
                  }
                  else
                  {
                    y = endY;
                    x = endX;
                  }
                }

              }
            }
            if(!testing && collided)
            {
              sprite.onCollide.dispatch(sprite, checkSprite);
            }
          }
        });
      }
    }
    return collided;
  }
  _calculateSpriteGridPos(sprite)
  {
    let gridPos = new Point(sprite.gridPos.x, sprite.gridPos.y);

    if(!sprite.speed.x)
    {
      gridPos.x = Math.round(sprite.position.x / this.game.gameWorld.tileSize);
    }
    else if(sprite.collidingX && sprite.speed.x)
    {
      gridPos.x = Math.round(sprite.position.x / this.game.gameWorld.tileSize);
    }
    else if(sprite.speed.x < 0 && sprite.position.x <= (gridPos.x - 1) * this.game.gameWorld.tileSize)
    {
      gridPos.x --;
    }
    else if(sprite.speed.x > 0 && sprite.position.x >= (gridPos.x + 1) * this.game.gameWorld.tileSize)
    {
      gridPos.x ++;
    }
    if(!sprite.speed.y)
    {
      gridPos.y = Math.round(sprite.position.y / this.game.gameWorld.tileSize);
    }
    else if(sprite.collidingY && sprite.speed.y)
    {
      gridPos.y = Math.round(sprite.position.y / this.game.gameWorld.tileSize);
    }
    if(sprite.speed.y < 0 && sprite.position.y <= (gridPos.y - 1) * this.game.gameWorld.tileSize)
    {
      gridPos.y --;
    }
    else if(sprite.speed.y > 0 && sprite.position.y >= (gridPos.y + 1) * this.game.gameWorld.tileSize)
    {
      gridPos.y ++;
    }
    return gridPos;
  }
  clear()
  {
    this.getAll().forEach((cell) =>
    {
      cell.obj.sprites.length = 0;
      cell.obj.wall = false;
    });
  }
}

class Timer
{
  constructor(endTime)
  {
    this.endTime = endTime;
    this.timer = 0;
    this.complete = false;
    this.onComplete = null;
    this.active = false;
  }
  update(deltaTime)
  {
    if(!this.complete && this.active)
    {
      this.timer += deltaTime;
      if(this.timer > this.endTime)
      {
        this.complete = true;
        if(this.onComplete)
        {
          this.onComplete(this);
        }
      }
    }
  }
  reset(active)
  {
    this.active = active;
    this.complete = false;
    this.timer = 0;
  }
}

class Signal
{
  constructor(game, sprite)
  {
    this.game = game;
    this.sprite = sprite;
    this.listeners = [];
  }
  dispatch(...args)
  {
    this.listeners.forEach((listener) =>
    {
      let currentParent = this.sprite;
      while(currentParent)
      {
        if(listener.listeningSprite === currentParent)
        {
          listener.callback(...args);
          if(listener.terminate)
          {
            break;
          }
        }
        currentParent.parent ? currentParent = currentParent.parent : currentParent = null;
      }
    });
  }
  addListener(listeningSprite, callback, terminate = false)
  {
    let listener = new Listener(listeningSprite, callback, terminate);
    this.listeners.push(listener);
    return listener;
  }
  removeListener(listener)
  {
    this.listeners.splice(ArrayFunctions.FindObjectIndex(this.listeners, listener), 1);
  }

}

class Listener
{
  constructor(listeningSprite, callback,  terminate = false)
  {
    this.listeningSprite = listeningSprite;
    this.callback = callback;
    this.terminate = terminate;
  }
}

class AudioPlayer
{
  constructor(world)
  {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext);
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = 0.1;
    this.alpha = Math.pow(2, (1/12));
    this.AFourFreq = 440;
    this.world = world;
  }
  playMusic(notes, tempo, loop = false)
  {
    let timer = new Timer(0);
    this.world.timers.push(timer);
    let noteQueue = [];
    let noteData = 0;
    let halfNoteDiff = 0;
    let period = 0;
    let noteFreq = 0;
    let noteIndex = -1;
    let osc = this.audioContext.createOscillator();
    osc.connect(this.masterGainNode);
    osc.type = "square";
    osc.start();

    timer.onComplete = () =>
    {
      nextNote();
    };
    let nextNote = () =>
    {
      noteIndex ++;
      if(noteIndex > noteQueue.length - 1 && loop)
      {
        noteIndex = 0;
      }
      let obj = noteQueue[noteIndex];
      if(obj)
      {
        timer.endTime = obj.period;
        timer.reset(true);
        osc.frequency.value = obj.noteFreq;
      }
      else
      {
        osc.stop();
      }
    }
    for(let i = 0; i < notes.length; i+=2)
    {
      noteData = parseInt(notes.substring(i, i + 2), 16);
      if((noteData & 0x3e) === 0x3e)
      {
        //blank
        noteFreq = 0;
      }
      else
      {
        halfNoteDiff = (noteData & 0x3e) >> 1;
        if(noteData & 0x1)
        {
          halfNoteDiff = -halfNoteDiff;
        }
        noteFreq = this.AFourFreq * Math.pow(this.alpha, halfNoteDiff);
      }
      period = (4 / (Math.pow(2, (noteData & 0xc0) >> 6))) / (tempo / 60);
      noteQueue.push(
      {
        noteFreq: noteFreq,
        period: period
      });
    }
    nextNote();
  }
}
