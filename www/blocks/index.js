(function () {

// Flatten Box2d (ugly but handy!)
(function b2(o) {
  for (k in o) {
    if (o.hasOwnProperty(k)) {
      if ($.isPlainObject(o[k])) {
        b2(o[k]);
      } else if (/^b2/.test(k)) {
        window[k] = o[k];
      }
    }
  }
}(Box2D));

// Inheritance utility (see: http://coffeescript.org/#try:class%20A%0Aclass%20B%20extends%20A)
function inherit(child, parent) {
  for (var key in parent) {
    if (parent.hasOwnProperty(key)) {
      child[key] = parent[key];
    }
  }

  function ctor() {this.constructor = child;}
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.uber = parent.prototype;

  return child;
};

//
// TODO Shims (to add)
//
// Function.prototype.bind
// Array.prototype.indexOf


var SCALE = 150;
function Real(options) {
  options || (options = {});

  options = $.extend(true, {
    debug: false
  }, options);

  this.clock = new Real.Timer();
  this.world = new b2World(
    new b2Vec2(0, 9.81), // gravity
    true                 // allow sleep
  );

  this.loop = new Loop(this.loop.bind(this)/*, 1000/10*/);
  //this.drawLoop = new Loop(this.drawLoop.bind(this));

  this.elements = [];

  // debug
  this.debug = !!options.debug;
  if (this.debug) {
    this.setDebugDraw();
  }

  this.updatePerf = new Stats();
  $('body').append(this.updatePerf.domElement);

  this.drawPerf = new Stats();
  $('body').append(this.drawPerf.domElement);
}
Real.prototype.setDebugDraw = function () {
  if ($('canvas.debugDraw').length > 0) return;

  var $window = $('html');
  var debugDraw = new b2DebugDraw();
  this.debugDraw = debugDraw;
  debugDraw.SetSprite($('<canvas class="debugDraw" width="' + ($window.width()) + '" height="' + ($window.height()) + '"/>').css({
    position: 'fixed',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    zIndex: -1
  }).appendTo('body').get(0).getContext("2d"));
  debugDraw.SetDrawScale(SCALE);
  debugDraw.SetFillAlpha(0.8);
  debugDraw.SetLineThickness(0.5);
  debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit | b2DebugDraw.e_centerOfMassBit);
  this.world.SetDebugDraw(debugDraw);
};
Real.prototype.unsetDebugDraw = function () {
  real.world.SetDebugDraw(null);
  $('canvas.debugDraw').remove();
};
Real.prototype.step = function (dt) {
  this.updatePerf.begin();

  this.world.Step(
    dt / 1000, //frame-rate
    8,   //velocity iterations
    3    //position iterations
  );

  if (this.debug) {
    this.world.DrawDebugData();
  }

  var i = this.elements.length;
  while (i--) {
    this.elements[i].update();
  }

  this.updatePerf.end();
};
Real.prototype.draw = function (smooth) {
  this.drawPerf.begin();

  var i = this.elements.length;
  while (i--) {
    this.elements[i].draw(smooth);
  }

  this.drawPerf.end();
};
Real.prototype.start = function () {
  this.clock.start();
  this.loop.start();
  //this.drawLoop.start();
};
Real.prototype.loop = function () {
  // http://gafferongames.com/game-physics/fix-your-timestep/
  // http://www.koonsolo.com/news/dewitters-gameloop/
  // http://www.unagames.com/blog/daniele/2010/06/fixed-time-step-implementation-box2d
  // http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/
  // http://actionsnippet.com/swfs/qbox_FRIM.html
  // http://gamesfromwithin.com/casey-and-the-clearly-deterministic-contraptions
  
  this.clock.tick();
  while (this.clock.accumulator >= this.clock.dt) {

    //console.log('update');
    this.step(this.clock.dt);
    this.clock.subtick();
  }
  this.world.ClearForces();
  
  this.draw(true);
};
Real.prototype.stop = function () {
  this.loop.stop();
  this.clock.stop();
  //this.drawLoop.stop();
};
Real.prototype.addElement = function (element) {
  this.elements.push(element);

  return element;
};
Real.prototype.removeElement = function (element) {
  this.world.DestroyBody(this.elements[i].body);
  this.elements.splice(this.element.indexOf(element), 1);
};
Real.prototype.findElement = function (el) {
  var i = this.elements.length;
  while (i--) {
    if (this.elements[i].el === el) {
      return this.elements[i];
    }
  }
};

function Timer() {
  this.t = 0;
  this.dt = 1000/60; // Max FPS

  this.currentTime = void 0;
  this.accumulator = void 0;

  this.dtMax = 1000/4; // Min FPS
}
Timer.prototype.start = function () {
  if (this.currentTime) {
    return;
  }
  this.currentTime = new Date().getTime();
  this.accumulator = 0;

  return this;
};
Timer.prototype.stop = function () {
  if (!this.currentTime) {
    return;
  }
  this.currentTime = void 0;
  this.accumulator = void 0;

  return this;
};
Timer.prototype.tick = function () {
  if (!this.currentTime) {
    throw "Timer not started!";
  }
  var newTime = new Date().getTime();

  var frameTime = newTime - this.currentTime;
  frameTime = Math.min(frameTime, this.dtMax);

  this.currentTime = newTime;
  
  this.accumulator += frameTime;

  return this;
};
Timer.prototype.subtick = function () {
  this.t           += this.dt;
  this.accumulator -= this.dt;
};
Real.Timer = Timer;


function State() {
  this.set.apply(this, arguments);
}
State.prototype.set = function (x, y, a) {
  this.x = x;
  this.y = y;
  this.a = a;

  return this;
};

function Element(el, real, options) {
  options || (options = {});

  this.$el = $(el);
  this.el = this.$el[0];

  // Defaults
  options = $.extend(true, {
    body: {
      type: b2Body.b2_dynamicBody,
    },
    fixture: {
      density: 1,
      friction: 0.5,
      restitution: 0.2,
      shape: b2PolygonShape
    }
  }, options);

  this.$el.addClass('element');

  this.real = real;

  // Fixture
  var fixDef = new b2FixtureDef;
  fixDef.density = options.fixture.density;
  fixDef.friction = options.fixture.friction;
  fixDef.restitution = options.fixture.restitution;
  // Shape
  if (options.fixture.shape === b2PolygonShape) {
    fixDef.shape = new b2PolygonShape;
    fixDef.shape.SetAsBox(
      this.$el.outerWidth() / 2 / SCALE, //half width
      this.$el.outerHeight() / 2 / SCALE  //half height
    );
  } else {
    fixDef.shape = new b2CircleShape(this.$el.outerWidth() / 2 / SCALE);
  }

  // Body
  var bodyDef = new b2BodyDef;
  bodyDef.type = options.body.type;
  this.origPos = {
    left: this.$el.offset().left,
    top: this.$el.offset().top,
    width: this.$el.outerWidth(),
    height: this.$el.outerHeight()
  };
  bodyDef.position.x = (this.origPos.left + this.origPos.width / 2) / SCALE;
  bodyDef.position.y = (this.origPos.top + this.origPos.height / 2) / SCALE;

  // Add to world
  this.body = real.world.CreateBody(bodyDef);
  this.body.CreateFixture(fixDef);

  var pos = this.body.GetPosition();
  var ang = this.body.GetAngle();
  this.state = new State(pos.x, pos.y, ang);
}
Element.prototype.update = function () {
  var pos = this.body.GetPosition();
  var ang = this.body.GetAngle();

  var x = pos.x;
  var y = pos.y;
  var a = ang;

  this.previousState = this.state; // backup previous state
  this.state = new State(x, y, a);
};
Element.prototype.draw = function (smooth) {
  if (this.body.GetType() === b2Body.b2_staticBody) {
    return;
  }

  var state;

  // Interpolate with previous state
  if (false && smooth && this.previousState) {
    /*var accumulator = this.real.clock.accumulator/1000

    var v = this.body.GetLinearVelocity();
    var w = this.body.GetAngularVelocity();

    x += v.x * accumulator;
    y += v.y * accumulator;
    a += w * accumulator;*/

    var fixedTimestepAccumulatorRatio = this.real.clock.accumulator / this.real.clock.dt;
    var oneMinusRatio = 1 - fixedTimestepAccumulatorRatio;

    var x = this.state.x * fixedTimestepAccumulatorRatio + oneMinusRatio * this.previousState.x;
    var y = this.state.y * fixedTimestepAccumulatorRatio + oneMinusRatio * this.previousState.y;
    var a = this.state.a * fixedTimestepAccumulatorRatio + oneMinusRatio * this.previousState.a;

    state = new State(x, y, a);
  } else {
    state = this.state;
  }

  var origPos = this.origPos;

  this.$el.css('transform', 'translate3d(' + ~~(state.x*SCALE - origPos.left  - origPos.width / 2) + 'px, ' + ~~(state.y*SCALE - origPos.top - origPos.height / 2) + 'px, 0) rotate3d(0,0,1,' + ~~(state.a * 180 / Math.PI) + 'deg)');
  //this.el.style.webkitTransform = 'translate3d(' + ~~(state.x*SCALE - origPos.left  - origPos.width / 2) + 'px, ' + ~~(state.y*SCALE - origPos.top - origPos.height / 2) + 'px, 0) rotate3d(0,0,1,' + ~~(state.a * 180 / Math.PI) + 'deg)';
};
Real.Element = Element;

function Joint(real, elA, elB) {
  elementA = real.findElement(elA);
  elementB = real.findElement(elB);

  if (!elementA || !elementB) {
    return;
  }

  var springDef;
  springDef = new b2DistanceJointDef();
  springDef.bodyA = elementA.body;
  springDef.bodyB = elementB.body;
  springDef.localAnchorA = springDef.bodyA.GetLocalCenter();
  springDef.localAnchorB = springDef.bodyB.GetLocalCenter();
  springDef.collideConnected = true;
  //springDef.dampingRatio = .2;
  //springDef.frequencyHz = .5
  springDef.length = (function () {
    var v = springDef.bodyB.GetWorldPoint(springDef.localAnchorB);
    v.Subtract(springDef.bodyA.GetWorldPoint(springDef.localAnchorA))
    return v.Length();
  }())

  real.world.CreateJoint(springDef)
};
Real.Joint = Joint;

//
// Ground
//

BallElement = (function(uber) {

  inherit(BallElement, uber);

  function angleVV(v1, v2) {
    var n1 = v1.Length();
    var n2 = v2.Length();

    return Math.atan2(v1.y/n1, v1.x/n1) - Math.atan2(v2.y/n2, v2.x/n2);
  }

  function BallElement() {
    BallElement.uber.constructor.apply(this, arguments);
    this.$tails = this.$el.find('b');
    this.$tailsContainer = this.$tails.parent();
  }
  BallElement.prototype.draw = function (smooth) {
    BallElement.uber.draw.apply(this, arguments);

    var state = this.state;

    var vel = this.body.GetLinearVelocityFromLocalPoint(new b2Vec2(0,0));
    //$tails.parent().css('transform', 'rotate3d(0,0,1,' + ~~((-this.body.GetAngle() + angleVV(vel, new b2Vec2(0, 1)) - Math.PI / 2) * 180 / Math.PI) + 'deg)')
    this.$tailsContainer.css('transform', 'rotate3d(0,0,1,' + ((-state.a + angleVV(vel, new b2Vec2(0, 1)) - Math.PI / 2) * 180 / Math.PI) + 'deg)');
    //this.$tailsContainer[0].style.webkitTransform = 'rotate3d(0,0,1,' + ((-state.a + angleVV(vel, new b2Vec2(0, 1)) - Math.PI / 2) * 180 / Math.PI) + 'deg)';

    (function ($tails) {
      var i = $tails.length;
      var velocity = vel.Length();
      while (i--) {
        var tailStyle = $tails[i].style;

        tailStyle.width =  velocity * 10 + '%';
        tailStyle.opacity = velocity / 10;
      }

    }(this.$tails));

  };

  return BallElement;

})(Element);

var real = new Real();
window.real = real;

real.addElement(new Real.Element($('.ground'), real, {body: {type: b2Body.b2_staticBody}}));
real.addElement(new BallElement($('.ball'), real, {fixture: {shape: b2CircleShape}}, BallElement));
$('.crate').each(function () {
  real.addElement(new Real.Element(this, real));
});
$(document.body).on('click touchstart', function (e) {
  if (e.target !== document.body) return;

  e = (~e.type.indexOf('touch') ? e.originalEvent.targetTouches[0] : e);

  var $el = $('<div class="crate" style="position:absolute;left:' + e.pageX + 'px; top:' + e.pageY + 'px;"/>').appendTo('body');
  real.addElement(new Real.Element($el[0], real));
});
$('.wall').each(function () {
  real.addElement(new Real.Element(this, real, {body: {type: b2Body.b2_staticBody}}));
});
real.addElement(new Real.Element($('.by')[0], real));
real.addElement(new Real.Element($('.chromexperiment')[0], real));

//new Real.Joint(real, $('.crate').get(0), $('.crate').get(1));
//new Real.Joint(real, $('.crate').get(1), $('.crate').get(2));

//
// MouseJoint
//

var mouse = new b2Vec2();
window.mouse = mouse;
var mouseJointDef = new b2MouseJointDef();
mouseJointDef.target = mouse;
mouseJointDef.bodyA = real.world.GetGroundBody();
mouseJointDef.collideConnected = true;

var mouseJoint;
var $elements = $(real.elements.map(function (element) {
  return element.el;
}));

function setMouse(e) {
  e = (~e.type.indexOf('touch') ? e.originalEvent.targetTouches[0] : e);

  mouse.Set(e.pageX / SCALE, e.pageY / SCALE);
}

function mousedown(e) {
  setMouse(e);

  $(document.body).undelegate('.element', 'mousedown touchstart', mousedown);
  $(window).one('mouseup touchend', mouseup);

  var element = real.findElement(this);
  var body = element && element.body;

  mouseJointDef.bodyB = body;
  mouseJointDef.maxForce = 100 * body.GetMass();

  mouseJoint = real.world.CreateJoint(mouseJointDef);
  mouseJoint.SetTarget(mouse);

  $(document).on('mousemove touchmove', mousemove);
}

function mouseup(e) {
  if (mouseJoint) {
    real.world.DestroyJoint(mouseJoint);
  }
  
  $(document.body).delegate('.element', 'mousedown touchstart', mousedown);
  $(window).off('mousemove touchmove', mousemove);
}

function mousemove(e) {
  e.preventDefault(); // http://stackoverflow.com/questions/11204460/the-touchmove-event-on-android-system-transformer-prime

  setMouse(e);
  mouseJointDef.bodyB.SetAwake(true);
}

$(document.body).delegate('.element', 'mousedown touchstart', mousedown);

// 
$(window).load(function () {
  real.start();

  if (window.DeviceMotionEvent) {
    real.world.m_allowSleep = false;
    function ondevicemotion(e) {
      real.world.SetGravity(new b2Vec2(-e.accelerationIncludingGravity.x, e.accelerationIncludingGravity.y));
    }
    window.addEventListener('devicemotion', ondevicemotion, false);
  }

  // prevent scroll
  document.ontouchstart = function(e){ 
      e.preventDefault(); // http://stackoverflow.com/questions/2890361/disable-scrolling-in-an-iphone-web-application#answer-2890530
  }

  // GUI

  var gui = new dat.GUI;
  gui.add(real, 'debug').onChange(function(value) {
    if (value) {
      real.setDebugDraw();
    } else {
      real.unsetDebugDraw();
    }
  });

  $(window).bind('keydown', 'space', function () {
    console.log('space', real.started);
    if (real.loop.id) {
      real.stop();
    } else {
      real.start()
    }
  });
});

}(jQuery, Box2D));