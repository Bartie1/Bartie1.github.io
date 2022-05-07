// import kaboom lib

import kaboom from "https://unpkg.com/kaboom/dist/kaboom.mjs";

// load kaboom    

kaboom({
  background: [0, 0, 0],
  fullscreen: true,
})

// load assets

loadSprite("wall", "sprites/wall.png");
loadSprite("space-ship", "sprites/space-ship.png");
loadSprite("invader", "sprites/invader.png")
loadSprite("star", "sprites/flame.png")
loadSprite("ghost", "sprites/ghost.png")
loadSound("main", "sounds/main_theme.mp3")
loadSound("main2", "sounds/main_theme2.mp3")
loadSound("shoot", "sounds/shoot.mp3")
loadSound("explosion", "sounds/explosion.mp3")
loadSound("pow", "sounds/poow.mp3")
layer(["obj","ui"], "obj")

// set global volume

const music = play("main2", {
    volume: 5,
    loop: true
    })
    
volume(0.4)

// reset cursor to default at frame start for easier cursor management

onUpdate(() => cursor("default"))

//--- define functions and constants that repeat themselves across levels

const MOVE_SPEED = 800 // player move speed
const BULLET_PLAYER_SPEED = 400 // player bullet speed
const LEVEL_DOWN = 500 // specifies for how much invaders move down each bounce

// spawn player function

function spawnPlayer() {
    const player = add([
        sprite("space-ship"),
        scale (0.5),
        pos(910,800),
        area(),
        solid(),
        ])
    return player
}

// player key controlls & movement

function defineControls(target){

keyDown("left", () => {
    target.move(-MOVE_SPEED, 0)
    if (target.pos.x < 0) {
                target.pos.x = width()
		}
    })

keyDown("right", () => {
    target.move(MOVE_SPEED, 0)
    if (target.pos.x > width()) {
                target.pos.x = 0
		}
    })

onKeyDown("up", () => {
     target.move(0, -MOVE_SPEED) 
    })

onKeyDown("down", () => {
    if (target.pos.y <= window.innerHeight*0.95) {
    target.move(0, MOVE_SPEED)} 
    })
}

// level wrapper for all levels

function addLevelWrapper(target_map) {
    return addLevel(
        target_map, 
        {
            width: Math.floor(window.innerWidth/69),
            height: Math.floor(window.innerHeight/8),

            "!": () => [sprite("wall"), "left_wall", area(), solid(), scale(0.4)],
            "&": () => [sprite("wall"), "right_wall", area(), solid(), scale(0.4)],
            "^": () => [sprite("invader"), "space_invader", area(), solid(), scale(0.2),]
        },
    )
}

// defining small invaders behaviour

function invadersMove(speed){
    let ispeed = speed
    action("space_invader", (s) => {
        s.move(ispeed, 0)
    })

    // invaders colide with walls

    collides("space_invader", "right_wall", () => {
        ispeed = -speed
        every("space_invader", (s) => {
            s.move(0, LEVEL_DOWN)
        })
    })

    collides("space_invader", "left_wall", () => {
        ispeed = speed
        every("space_invader", (s) => {
            s.move(0, LEVEL_DOWN)
        })
    })
}

// spawn Particles

function spawnParticles(target) {
    const sprites = ["star"]

    sprites.forEach((spr) => {
        loadSprite(spr, "sprites/flame.png")
    })

    // Spawn one particle every 0.1 second
    loop(0.1, () => {

        // Compose particle properties with components
        const item = add([
            pos(target/* target means player arg */.pos.add(27, 83)),
            sprite(choose(sprites)),
            origin("center"),
            scale(rand(0.5, 1)),
            area(),
            body({ solid: false, }),
            lifespan(1, { fade: 0.5 }),
        ])

    })
}


// spawn player's bullets when space is hit

function spawn_player_bullets_on_hitting_space(target) {

    function bullet_player(p) {
    add([
        area(),
        rect(6,18),
        pos(p),
        origin("center"),
        color(0, 255, 255),
        "bullet_player"
        ])
    }

    action("bullet_player", (b_p) => {
            b_p.move(0, -BULLET_PLAYER_SPEED)
            if (b_p.pos.y < 0){
                destroy(b_p)
            }
        })

    keyPress("space", () => {
        bullet_player(target.pos.add(30,-5)),
        play("shoot")
    })

}

// die if player colldes with invaders

function player_dies_if_collides_with_invaders(target_repeat_level, target, target_score) {

    target.onCollide("space_invader", () => {
        go(target_repeat_level, {target_score: target_score.value})
    })
}

// space invader collides with player's bullets + scoreupdate

function player_bullets_collide_with_invaders(target_next_level, target_score, target_score_required_for_next_level){

    collides("bullet_player", "space_invader", (b,s) => {
        destroy(b)
        destroy(s)
        addKaboom(b.pos)
        target_score.value++
        target_score.text = target_score.value
        play("explosion")
        if (target_score.value == target_score_required_for_next_level) {
            go(target_next_level)
        }    
    })
}

// player dies from bullet

function player_dies_from_bullets(target_repeat_level, target, target_score) {

    target.onCollide("bullet", (bullet) => {
        destroy(bullet)
        destroy(target)
        addKaboom(bullet.pos)
        go(target_repeat_level, { target_score: target_score.value})
    })
}

//---------------------------------

function spanwnPowerfulInvaders(target_invaders, target_player, target_score, target_powerful_invaders_settings) {
    

    target_invaders.forEach(powerful_invader => {
        powerful_invader.onStateEnter("idle", async () =>{
            await wait(rand(0.1, 1))
            powerful_invader.enterState("attack")
        })

        powerful_invader.onStateEnter("attack", async () => {
            if (powerful_invader.exists()){
                const dir = target_player.pos.sub(powerful_invader.pos).unit()    
                add ([
                    pos(powerful_invader.pos),
                    move(dir, target_powerful_invaders_settings.bullet_speed),
                    rect(30,10),
                    area(),
                    cleanup(),
                    origin("center"),
                    color(0, 255, 0),
                    play("pow"),
                    "bullet"
                    ])
                }

        await wait(0.2)
        powerful_invader.enterState("move")
        })

        powerful_invader.onStateEnter("move", async () => {
            await wait(0.2)
            powerful_invader.enterState("idle")
        })

        powerful_invader.onStateUpdate("move", () => {
            if (!target_player.exists()) return
            powerful_invader.move(target_powerful_invaders_settings.speed, 0)
        })

        powerful_invader.onStateUpdate("attack", () => {
            if (!target_player.exists()) return
            powerful_invader.move(target_powerful_invaders_settings.speed, 0)
        })

        powerful_invader.onStateUpdate("idle", () => {
            if (!target_player.exists()) return
            powerful_invader.move(target_powerful_invaders_settings.speed, 0)
        })

        powerful_invader.enterState("idle")
    })

    // powerful invaders collide with player bullets

    target_invaders.forEach(powerful_invader => {
        powerful_invader.onCollide("bullet_player", (bullet_player) => {
            destroy(powerful_invader)
            destroy(bullet_player)
            target_score.value++
            target_score.text = target_score.value    
            })
        })


    // powerful_invader collides with walls

    target_invaders.forEach(powerful_invader =>{
        powerful_invader.onCollide("right_wall", (rightwall) => {
            target_powerful_invaders_settings.speed = -400
            powerful_invader.move(0, LEVEL_DOWN)
            })
        })
        
    target_invaders.forEach(powerful_invader =>{
        powerful_invader.onCollide("left_wall", (leftwall) => {
            target_powerful_invaders_settings.speed = 400
            powerful_invader.move(0, LEVEL_DOWN)
            })
        })
    
}

//-----------------------

// spawn score

function spawnScore() {

    const score = add([
    text("0"),
    pos(20, 180),
    layer("ui"),
    scale(1),
        {
            value: 0,
        }
    ])
    return score
}

// spawn timer that when ends the player loses

function spawnTimer(target_repeat_level, target_time_left) {
    const timer = add([
        text("0"),
        pos(10, 20),
        scale(1),
        layer("ui"),
                {
                time: target_time_left
                },
            ])

        timer.action(() => {
            timer.time -= dt()
            timer.text = timer.time.toFixed(1)
            if (timer.time <= 0) {
                go(target_repeat_level)
        }
    })
    return timer
}

// -------------------------------------------------- Game Level 1 ------------------------------------------------------------------------       

scene("game_1", () => {

    music.play()

//game area

const map1 = [
    "!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
    "!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
    "!                                                                   &", 
    "!                                                                   &", 
    "!                                                                   &", 
    "!                                                                   &",  
    "!                                                                   &", 
    "!                                                                   &",   
]

const gameLevel = addLevelWrapper(map1)

let repeat_level = "win_0" // repeat current level
let next_level = "win_1" // next level
let score_required_for_next_lvl = 24 // score required to move to next round
let time_left = 30 // show time to complete the round

const player = spawnPlayer() // spawn player
const score = spawnScore() // score display
const timer = spawnTimer(repeat_level, time_left) // spawn timer 

spawnParticles(player) // Particle spawning
defineControls(player) // define controls
spawn_player_bullets_on_hitting_space(player) // spawning bullets player
invadersMove(300) // trigger invader's movement
player_dies_from_bullets(repeat_level, player, score) // player dies from bullet
player_dies_if_collides_with_invaders(repeat_level, player, score) // invaders collide with player (player dies)
player_bullets_collide_with_invaders(next_level, score, score_required_for_next_lvl) // invaders collides with player bullets and die + accumulates score
})
     

// -------------------------------------------------- Game Level 2  ------------------------------------------------------------------------       

scene("game_2", () => {

    music.play()

//game area

const map2 = [
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &",  
"!                                                                   &", 
"!                                                                   &", 
"!                                                                   &",  
"!                                                                   &", 
"!                                                                   &",  
];

const gameLevel = addLevelWrapper(map2)

let repeat_level = "win_1" // repeat current level
let next_level = "win_2" // next level
let score_required_for_next_lvl = 38 // score required to move to next round
let time_left = 40 // show time to complete the round

const player = spawnPlayer() // spawn player
const score = spawnScore() // score display
const timer = spawnTimer(repeat_level, time_left) // spawn timer 

spawnParticles(player) // Particle spawning
defineControls(player) // define controls
spawn_player_bullets_on_hitting_space(player) // spawning bullets player
invadersMove(300) // trigger invader's movement
player_dies_from_bullets(repeat_level, player, score) // player dies from bullet
player_dies_if_collides_with_invaders(repeat_level, player, score) // invaders collide with player (player dies)
player_bullets_collide_with_invaders(next_level, score, score_required_for_next_lvl) // invaders collides with player bullets and die + accumulates score


// --------------- LEVEL 2 ADDING POWEFUL INVADERS -------------


const powerful_invaders_settings = {
    "speed": 400,
    "bullet_speed": 800,
    "bullet_color": "red",
    "bullet_size": (20, 20)
}

const powerful_invader = add ([
        pos(100, 100),
        sprite("invader"),
        scale(0.5),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader"
    ])


    const powerful_invader2 = add ([
        pos(300, 100),
        sprite("invader"),
        scale(0.5),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader2"
    ])
 

const invaders = [powerful_invader, powerful_invader2]


spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_settings)

})

// ----------- POWERFUL INVADERS END ------------

// -------------------------------------------------- Game scene 2 end ------------------------------------------------------------------------    

// -------------------------------------------------- Game Level 3  ------------------------------------------------------------------------       

scene("game_3", () => {

//game area

const map3 = [
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &",  
"!                                                                   &", 
"!                                                                   &", 
"!                                                                   &",  
"!                                                                   &", 
"!                                                                   &",  
];

const gameLevel = addLevelWrapper(map3)

let repeat_level = "win_2" // repeat current level
let next_level = "win_3" // next level
let score_required_for_next_lvl = 39 // score required to move to next round
let time_left = 50 // show time to complete the round

const player = spawnPlayer() // spawn player
const score = spawnScore() // score display
const timer = spawnTimer(repeat_level, time_left) // spawn timer 

spawnParticles(player) // Particle spawning
defineControls(player) // define controls
spawn_player_bullets_on_hitting_space(player) // spawning bullets player
invadersMove(300) // trigger invader's movement
player_dies_from_bullets(repeat_level, player, score) // player dies from bullet
player_dies_if_collides_with_invaders(repeat_level, player, score) // invaders collide with player (player dies)
player_bullets_collide_with_invaders(next_level, score, score_required_for_next_lvl) // invaders collides with player bullets and die + accumulates score


// --------------- LEVEL 3 ADDING POWEFUL INVADERS -------------

const powerful_invaders_speed = 400
const powerful_invaders_bullet_speed = 800


const powerful_invader = add ([
        pos(100, 100),
        sprite("invader"),
        scale(0.5),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader"
    ])


    const powerful_invader2 = add ([
        pos(300, 100),
        sprite("invader"),
        scale(0.5),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader2"
    ])


    const powerful_invader3 = add ([
        pos(500, 100),
        sprite("invader"),
        scale(0.5),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader3"
    ])
 

const invaders = [powerful_invader, powerful_invader2, powerful_invader3]

spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_speed, powerful_invaders_bullet_speed)


})

// ----------- POWERFUL INVADERS END ------------

// -------------------------------------------------- Game Level 3 end  ------------------------------------------------------------------------       

    

// -------------------------------------------------- Game Level 4  ------------------------------------------------------------------------       

scene("game_4", () => {

//game area

const map4 = [
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &",  
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &",   
"!                                                                   &", 
"!                                                                   &",  
"!                                                                   &", 
"!                                                                   &",  
];

const gameLevel = addLevelWrapper(map4)

let repeat_level = "win_35" // repeat current level
let next_level = "win_4" // next level
let score_required_for_next_lvl = 52 // score required to move to next round
let time_left = 50 // show time to complete the round

const player = spawnPlayer() // spawn player
const score = spawnScore() // score display
const timer = spawnTimer(repeat_level, time_left) // spawn timer 

spawnParticles(player) // Particle spawning
defineControls(player) // define controls
spawn_player_bullets_on_hitting_space(player) // spawning bullets player
invadersMove(300) // trigger invader's movement
player_dies_from_bullets(repeat_level, player, score) // player dies from bullet
player_dies_if_collides_with_invaders(repeat_level, player, score) // invaders collide with player (player dies)
player_bullets_collide_with_invaders(next_level, score, score_required_for_next_lvl) // invaders collides with player bullets and die + accumulates score


// --------------- LEVEL 4 ADDING POWEFUL INVADERS -------------

const powerful_invaders_speed = 700
const powerful_invaders_bullet_speed = 1000


const powerful_invader = add ([
        pos(100, 100),
        sprite("invader"),
        scale(0.6),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader"
    ])


    const powerful_invader2 = add ([
        pos(300, 100),
        sprite("invader"),
        scale(0.6),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader2"
    ])


    const powerful_invader3 = add ([
        pos(500, 100),
        sprite("invader"),
        scale(0.6),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader3"
    ])

    const powerful_invader4 = add ([
        pos(700, 100),
        sprite("invader"),
        scale(0.5),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader4"
    ])


 

const invaders = [powerful_invader, powerful_invader2, powerful_invader3, powerful_invader4]

spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_speed, powerful_invaders_bullet_speed)

})

// ----------- POWERFUL INVADERS END ------------

// -------------------------------------------------- Game Level 4 end  ------------------------------------------------------------------------   


// -------------------------------------------------- Game Level 5  ------------------------------------------------------------------------       

scene("game_5", () => {

//game area

const map5 = [
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &", 
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &",  
"!    ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^   ^                  &",   
"!                                                                   &", 
"!                                                                   &",  
"!                                                                   &", 
"!                                                                   &",  
];

const gameLevel = addLevelWrapper(map5)

let repeat_level = "win_4" // repeat current level
let next_level = "win_5" // next level
let score_required_for_next_lvl = 52 // score required to move to next round
let time_left = 50 // show time to complete the round

const player = spawnPlayer() // spawn player
const score = spawnScore() // score display
const timer = spawnTimer(repeat_level, time_left) // spawn timer 

spawnParticles(player) // Particle spawning
defineControls(player) // define controls
spawn_player_bullets_on_hitting_space(player) // spawning bullets player
invadersMove(700) // trigger invader's movement
player_dies_from_bullets(repeat_level, player, score) // player dies from bullet
player_dies_if_collides_with_invaders(repeat_level, player, score) // invaders collide with player (player dies)
player_bullets_collide_with_invaders(next_level, score, score_required_for_next_lvl) // invaders collides with player bullets and die + accumulates score

// --------------- LEVEL 5 ADDING POWEFUL INVADERS -------------

const powerful_invaders_speed = 700
const powerful_invaders_bullet_speed = 1000


const powerful_invader = add ([
        pos(100, 100),
        sprite("invader"),
        scale(0.8),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader"
    ])


    const powerful_invader2 = add ([
        pos(300, 100),
        sprite("invader"),
        scale(0.8),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader2"
    ])


    const powerful_invader3 = add ([
        pos(500, 100),
        sprite("invader"),
        scale(0.8),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader3"
    ])

    const powerful_invader4 = add ([
        pos(700, 100),
        sprite("invader"),
        scale(0.8),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader4"
    ])


 

const invaders = [powerful_invader, powerful_invader2, powerful_invader3, powerful_invader4]

spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_speed, powerful_invaders_bullet_speed)

})

// ----------- POWERFUL INVADERS END ------------

// -------------------------------------------------- Game Level 5 end  ------------------------------------------------------------------------   


// -------------------------------------------------- S-C-E-N-E-S ------------------------------------------------------------------------   





// scene win_1

scene("win_1", () => {

    add([
    pos(500, 250),
    text("LEVEL 2.\n \nInvaders count: 36.\n\nPOWERFUL INVADERS count: 2\n\nTime: 40 seconds.\n\nEliminate invaders.\n\nMouse click to continue!", {
        size: 48, 
        width: 1400, 
        font: "sink", 
    }),
    onClick(() => go("game_2"))
])
})


// scene win_2

scene("win_2", () => {
    add([
    pos(500, 250),
text("LEVEL 3.\n \nInvaders count: 36.\n\n POWERFUL INVADERS count: 3\n\nTime: 50 seconds.\n\nEliminate invaders.\n\nMouse click to continue!", {
        size: 48, 
        width: 1400, 
        font: "sink", 
    }),
    onClick(() => go("game_3"))
])
})

// scene win_3

scene("win_3", () => {
    add([
    pos(500, 250),
text("You win!\n\n Password to move to the next puzzle is is: PASSWORD1\n\n Or mouse click to  carry on playing\n\n There are 2 levels left!", {
        size: 48, 
        width: 1400, 
        font: "sink", 
    }),

onClick(() => go("win_35"))

])
})

// scene win_3.5

scene("win_35", () => {
    add([
    pos(500, 250),
text("LEVEL 4.\n\nInvaders count: 48.\n\n POWERFUL INVADERS count: 4\n\nTime: 50 seconds.\n\nPOWERFUL INVADERS ARE UPGRADED.\n\nMouse click to continue!", {
        size: 48, 
        width: 1400, 
        font: "sink", 
    }),

onClick(() => go("game_4"))

])
})

// scene win_4

scene("win_4", () => {
    add([
    pos(500, 250),
text("LEVEL 5. FINAL LEVEL \n\nInvaders count: 46.\n\n POWERFUL INVADERS count: 4\n\nTime: 50 seconds.\n\nALL INVADERS ARE UPGRADED.\n\nMouse click to continue!", {
        size: 48, 
        width: 1400, 
        font: "sink", 
    }),

onClick(() => go("game_5"))



])
})

// scene win_5

scene("win_5", () => {
    add([
    pos(500, 250),
text("Congratulations on beating my game!", {
        size: 48, 
        width: 1400, 
        font: "sink", 
    }),

onClick(() => go("main_menu"))

])
})

// start program with main menu scene

// -------------------------------------------------- Main menu  ------------------------------------------------------------------------                                           

scene("main_menu", () => {

//spooky ghost and text

const ghost = add([
    sprite("ghost"),
    scale (0.7),
    pos(1200,600),
    ])


add([
pos(700, 300),
text("LIBRARY GHOST DEMANS YOU PLAY THE GAME TO MOVE FORWARD!\n\n\n 'Use arrow keys to move around, space to shoot!'", {
    size: 38,
    width: 800, 
    font: "sink", 
}
)])

//add button function

function addButton(txt, p, f) {

const btn = add([
    text(txt, {
        size: 96,
        font: "sink"}),
        color (0,255,0),
    pos(p),
    area({ cursor: "pointer", }),
    scale(1),
    origin("center"),
    
])

btn.onClick(f)
}

// menu buttons

addButton("Start", vec2(300, 300), () => start() )
addButton("Quit", vec2(300, 500), () => debug.log("Actually this program can't close the browser by itself yet."))

})

// -------------------------------------------------- Main menu end  ------------------------------------------------------------------------ 


function start() {
	go("win_0")
}

// scene win_0 - prompt after starting game

scene("win_0", () => {
    add([
    pos(500, 250),
    text("LEVEL 1.\n \nInvaders count: 24.\n\nTime: 30 seconds.\n\nEliminate invaders.\n\nPress any key to continue!", {
        size: 48,
        width: 1400, 
        font: "sink", //  "apl386", "apl386o", "sink", "sinko"
    }),
    onClick(() => go("game_1"))
])
})

go("main_menu")