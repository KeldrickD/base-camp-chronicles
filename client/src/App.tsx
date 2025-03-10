import { useEffect } from 'react'
import styled from 'styled-components'
import Phaser from 'phaser'
import gameConfig from './game/config'

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #1a1a1a;
  color: white;
`

const Header = styled.header`
  padding: 1rem;
  background-color: #2a2a2a;
  text-align: center;
`

const GameContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`

function App() {
  useEffect(() => {
    const game = new Phaser.Game({
      ...gameConfig,
      parent: 'game-container'
    })

    return () => {
      game.destroy(true)
    }
  }, [])

  return (
    <AppContainer>
      <Header>
        <h1>BaseCamp Chronicals</h1>
      </Header>
      <GameContainer>
        <div id="game-container" />
      </GameContainer>
    </AppContainer>
  )
}

export default App
