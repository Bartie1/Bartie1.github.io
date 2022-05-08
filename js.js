// load kaboom    

kaboom({
  background: [0, 0, 0],
  fullscreen: true,
})

// load assets

loadSprite("wall", "sprites/wall.png");
loadSprite("space-ship", "sprites/space-ship.png");
loadSprite("invader", "sprites/invader.png")
loadSprite("ghost", "sprites/ghost.png")
loadSound("main", "sounds/main_theme.mp3")
loadSound("main2", "sounds/main_theme2.mp3")
loadSound("shoot", "sounds/shoot.mp3")
loadSound("explosion", "sounds/explosion.mp3")
loadSound("pow", "sounds/poow.mp3")
layer(["obj","ui"], "obj")

// stars!

loadSprite("red", "sprites/red.png")
loadSprite("blue", "sprites/blue.png")
loadSprite("purple", "sprites/purple.png")
loadSprite("green", "sprites/green.png")
loadSprite("pink", "sprites/pink.png")

// set global volume

volume = 0.4

const music = play(choose(["main", "main2"]), {
    loop: true,
    })

// reset cursor to default at frame start for easier cursor management

onUpdate(() => cursor("default"))

//-------------------- define functions and constants that repeat themselves across levels ------------------------------------

const MOVE_SPEED = 800 // player move speed
const BULLET_PLAYER_SPEED = 400 // player bullet speed
const LEVEL_DOWN = 500 // specifies for how much invaders move down each bounce

// spawn player function

function spawnPlayer() {
    const player = add([
        sprite("space-ship"),
        scale (0.5),
        pos(Math.floor(window.innerWidth/2), window.innerHeight*0.8),
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

// spawn falling stars

function spawnBackgroundParticles(target_stars_loop) {
    const sprites = ["pink"]

    loop(target_stars_loop, () => {
        const stars = add([
            pos(Math.floor(window.innerWidth/2),-50),
            sprite(choose(sprites)),
            origin("center"),
            scale(rand(0.5, 1)),
            area(),
            body({ solid: false, }),
            lifespan(10, { fade: 0.5 }),
            move(choose([LEFT, RIGHT]), rand(0, Math.floor(window.innerWidth/6))),
            rotate(),
            gravity(50),
            "stars"
        ])
        
        stars.onUpdate(() => {
            stars.angle += 90 * dt()
        })
    })
}

// spawn flames particles

function spawnParticles(target) {
    const sprites = ["blue", "purple", "green", "red", "pink"]

    loop(0.08, () => {
        const stars = add([
            pos(target/* target means player arg */.pos.add(27, 83)),
            sprite(choose(sprites)),
            origin("center"),
            scale(rand(0.5, 1)),
            area(),
            body({ solid: false, }),
            lifespan(2, { fade: 1 }),
            move(choose([LEFT, RIGHT, DOWN]), rand(10, 20)),
            rotate()
        ])
        
        stars.onUpdate(() => {
            stars.angle += 90 * dt()
        })


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
        shake(200)
        addKaboom(target.pos)
        destroy(target)
        wait(2, () =>
            go(target_repeat_level, {target_score: target_score.value}))
    })
}

// die if player colldes with stars

function player_dies_if_collides_with_stars(target_repeat_level, target, target_score) {

    target.onCollide("stars", () => {
        shake(200)
        addKaboom(target.pos)
        destroy(target)
        wait(2, () =>
            go(target_repeat_level, {target_score: target_score.value}))
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
        shake(200)
        wait(2, () =>
            go(target_repeat_level, {target_score: target_score.value}))
    })
}

// powerful invader wrapper

function invaderWrap(target_starting_postions, target_powerful_invader_scale){
   const bonzo = add ([
        pos(target_starting_postions),
        sprite("invader"),
        scale(target_powerful_invader_scale),
        state("idle", ["idle", "attack", "move"]),
        area(),
        "powerful_invader"
    ])   
    return bonzo
}

// powerful invaders AI

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


// esc to main menu

function escToMenu() {
    onKeyPress("escape", () => go("main_menu"))
    onKeyPress("1", () => go("game_1"))
    onKeyPress("2", () => go("game_2"))
    onKeyPress("3", () => go("game_3"))
    onKeyPress("4", () => go("game_4"))
    onKeyPress("5", () => go("game_5"))
    onKeyPress("6", () => go("win_5"))
    onKeyPress("k", () => music.play())
    onKeyPress("m", () => music.pause())
}

// displays random hints

function randomHint(){
    const hints = choose([
    "Avoid the falling stars!",
    "You can move left and right and up and down",
    "Press space to shoot",
    "Invaders and their bullets move faster with each level",
    "Did you know that you only need to complete level 3 to move to the next puzzle?",
    "Stars fall down faster with each level",
    "If you lose a round you repeat the same level",
    "I am really fond of egg cheese sandwitches for breakfast",
    "Press ESC to go back to the menu",
    "Press M to mute the music, K to unmute",
    "If level 5 is too hard you can always give up"
    ])
    debug.log(hints)
}


// -------------------------------------------------- Game Level 1 ------------------------------------------------------------------------       

scene("game_1", () => {

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
let stars_loop = 0.3 // stars loop every X sec (lower = stars drop faster)


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

spawnBackgroundParticles(stars_loop) // enable stars falling
player_dies_if_collides_with_stars(repeat_level, player, score) // stars collide with player (player dies)
randomHint() // generates random hints
escToMenu()
})
     
// -------------------------------------------------- Game Level 2  ------------------------------------------------------------------------       

scene("game_2", () => {

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
let stars_loop = 0.3 // stars loop every X sec (lower = stars drop faster)

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

spawnBackgroundParticles(stars_loop) // enable stars falling
player_dies_if_collides_with_stars(repeat_level, player, score) // stars collide with player (player dies)
randomHint() // generates random hints
escToMenu()


// --------------- LEVEL 2 ADDING POWEFUL INVADERS -------------

const powerful_invaders_settings = {
    "speed": 400,
    "bullet_speed": 800,
    "bullet_color": "red",
    "bullet_size": (20, 20),    
}

let powerful_invader_starting_postion_1 = [100, 100] // powerful invader 1, starting position
let powerful_invader_starting_position_2 = [700, 100] // powerful invader 2, starting position
let powerful_invader_scale = (0.5) // powerful invaders size

let powerful_invader = invaderWrap(powerful_invader_starting_postion_1, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader2 = invaderWrap(powerful_invader_starting_position_2, powerful_invader_scale) // wrap starting positions with the rest of args

const invaders = [powerful_invader, powerful_invader2]
spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_settings) // spawn invaders function that adds AI/bullets/mechanics
})
 
// -------------------------------------------------- Game Level 3  ------------------------------------------------------------------------       

scene("game_3", () => {

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
let stars_loop = 0.3 // stars loop every X sec (lower = stars drop faster)

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

spawnBackgroundParticles(stars_loop) // enable stars falling
player_dies_if_collides_with_stars(repeat_level, player, score) // stars collide with player (player dies)
randomHint() // generates random hints
escToMenu()

// --------------- LEVEL 3 ADDING POWEFUL INVADERS -------------

const powerful_invaders_settings = {
    "speed": 400,
    "bullet_speed": 800,
    "bullet_color": "red",
    "bullet_size": (20, 20),    
}

let powerful_invader_starting_postion_1 = [100, 100] // powerful invader 1, starting position
let powerful_invader_starting_position_2 = [400, 100] // powerful invader 2, starting position
let powerful_invader_starting_position_3 = [700, 100] // powerful invader 2, starting position
let powerful_invader_scale = (0.5) // powerful invaders size

let powerful_invader = invaderWrap(powerful_invader_starting_postion_1, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader2 = invaderWrap(powerful_invader_starting_position_2, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader3 = invaderWrap(powerful_invader_starting_position_3, powerful_invader_scale) // wrap starting positions with the rest of args

const invaders = [powerful_invader, powerful_invader2, powerful_invader3]
spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_settings) // spawn invaders function that adds AI/bullets/mechanics
})

// -------------------------------------------------- Game Level 4  ------------------------------------------------------------------------       

scene("game_4", () => {

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
let stars_loop = 0.2 // stars loop every X sec (lower = stars drop faster)

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

spawnBackgroundParticles(stars_loop) // enable stars falling
player_dies_if_collides_with_stars(repeat_level, player, score) // stars collide with player (player dies)
escToMenu()

// --------------- LEVEL 4 ADDING POWEFUL INVADERS -------------

const powerful_invaders_settings = {
    "speed": 400,
    "bullet_speed": 800,
    "bullet_color": "red",
    "bullet_size": (20, 20),    
}

let powerful_invader_starting_postion_1 = [100, 100] // powerful invader 1, starting position
let powerful_invader_starting_position_2 = [300, 100] // powerful invader 2, starting position
let powerful_invader_starting_position_3 = [500, 100] // powerful invader 2, starting position
let powerful_invader_starting_position_4 = [700, 100] // powerful invader 2, starting position
let powerful_invader_scale = (0.5) // powerful invaders size

let powerful_invader = invaderWrap(powerful_invader_starting_postion_1, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader2 = invaderWrap(powerful_invader_starting_position_2, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader3 = invaderWrap(powerful_invader_starting_position_3, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader4 = invaderWrap(powerful_invader_starting_position_4, powerful_invader_scale) // wrap starting positions with the rest of args

const invaders = [powerful_invader, powerful_invader2, powerful_invader3, powerful_invader4]
spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_settings) // spawn invaders function that adds AI/bullets/mechanics
randomHint() // generates random hints
})

// -------------------------------------------------- Game Level 5  ------------------------------------------------------------------------       

scene("game_5", () => {

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
let stars_loop = 0.05 // stars loop every X sec (lower = stars drop faster)

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

spawnBackgroundParticles(stars_loop) // enable stars falling
player_dies_if_collides_with_stars(repeat_level, player, score) // stars collide with player (player dies)
randomHint() // generates random hints
escToMenu()

// --------------- LEVEL 5 ADDING POWEFUL INVADERS -------------

const powerful_invaders_settings = {
    "speed": 400,
    "bullet_speed": 800,
    "bullet_color": "red",
    "bullet_size": (20, 20),    
}

let powerful_invader_starting_postion_1 = [100, 100] // powerful invader 1, starting position
let powerful_invader_starting_position_2 = [300, 100] // powerful invader 2, starting position
let powerful_invader_starting_position_3 = [500, 100] // powerful invader 2, starting position
let powerful_invader_starting_position_4 = [700, 100] // powerful invader 2, starting position
let powerful_invader_scale = (0.8) // powerful invaders size

let powerful_invader = invaderWrap(powerful_invader_starting_postion_1, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader2 = invaderWrap(powerful_invader_starting_position_2, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader3 = invaderWrap(powerful_invader_starting_position_3, powerful_invader_scale) // wrap starting positions with the rest of args
let powerful_invader4 = invaderWrap(powerful_invader_starting_position_4, powerful_invader_scale) // wrap starting positions with the rest of args

const invaders = [powerful_invader, powerful_invader2, powerful_invader3, powerful_invader4]
spanwnPowerfulInvaders(invaders, player, score, powerful_invaders_settings) // spawn invaders function that adds AI/bullets/mechanics
})

// -------------------------------------------------- S-C-E-N-E-S ------------------------------------------------------------------------   

// scene win_1

scene("win_1", () => {
    add([
        pos(window.innerWidth*0.1, window.innerHeight*0.1),
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
        pos(window.innerWidth*0.1, window.innerHeight*0.1),
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
        pos(window.innerWidth*0.1, window.innerHeight*0.1),
        text("You win!\n\n Password to move to the next puzzle is is: PASSWORD1\n\n Good luck during the rest of the escape room!", {
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
        pos(window.innerWidth*0.1, window.innerHeight*0.1),
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
        pos(window.innerWidth*0.1, window.innerHeight*0.1),
        text("LEVEL 5. FINAL LEVEL \n\nInvaders count: 46.\n\n POWERFUL INVADERS count: 4\n\nTime: 50 seconds.\n\nARE YOU READY FOR TOTAL BULLET HELL MAYHEM?\n\nMouse click to continue!", {
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
        pos(window.innerWidth*0.1, window.innerHeight*0.1),
        text("Congratulations on beating my game!\n\n I made the game using JavaScript and kaboom.js library. \n\n Sprites and graphics used in this game are eithier freebies, library inbuilt, or made in paint.\n\n All the sounds & music has been written and recorded in Musescore by me. \n\n Press ESC to go to back", {
            size: 36, 
            width: 1400, 
            font: "sink", 
        }),
    ])

    escToMenu()
    const player = spawnPlayer() // spawn player
    defineControls(player) // define controls
    let stars_loop = 0.05 // stars loop every X sec (lower = stars drop faster)
    spawnBackgroundParticles(stars_loop) // enable stars falling
    spawnParticles(player) // Particle spawning 

})

// start program with main menu scene

// -------------------------------------------------- Main menu  ------------------------------------------------------------------------                                           

scene("main_menu", () => {

    let stars_loop = 0.1 // stars loop every X sec (lower = stars drop faster)
    spawnBackgroundParticles(stars_loop) // enable stars falling
    escToMenu()

//spooky ghost and text

    const ghost = add([
        sprite("ghost"),
        scale (0.7),
        pos(window.innerWidth*0.5, window.innerHeight*0.5),,
    ])



    add([
        pos(window.innerWidth*0.5, window.innerHeight*0.2),,
        text("LIBRARY GHOST DEMANS YOU PLAY THE GAME TO MOVE FORWARD!\n\n\n 'Use arrow keys to move around, space to shoot!'", {
        size: 38,
        width: 800, 
        font: "sink", 
        })
    ])

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

    addButton("Start", vec2(window.innerWidth*0.1, window.innerHeight*0.1), () => start() )
    addButton("Quit", vec2(window.innerWidth*0.1, window.innerHeight*0.3), () => debug.log("If you can't beat the game and are ready to give up the password is: Password1"))

})

// -------------------------------------------------- Main menu end  ------------------------------------------------------------------------ 

// scene win_0 - prompt after starting game

function start() {
	go("win_0")
}

scene("win_0", () => {
    add([
    pos(window.innerWidth*0.1, window.innerHeight*0.1),
    text("LEVEL 1.\n \nInvaders count: 24.\n\nTime: 30 seconds.\n\nEliminate invaders.\n\nPress any key to continue!", {
        size: 48,
        width: 1400, 
        font: "sink", //  "apl386", "apl386o", "sink", "sinko"
    }),
    onClick(() => go("game_1"))
    ])
})

// start program    

go("main_menu")
