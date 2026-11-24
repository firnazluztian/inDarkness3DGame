import './style.css'
import { Game } from './game/game'

const game = new Game()
game.mount()

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy())
}
