import { openScreen } from './screens.js';
import * as GameScreen from './screens/game.js';
import * as ResultScreen from './screens/result.js';
import type {Cell, GameMove, GameState, GamePut} from '../common/messages.js';

GameScreen.setTurnHandler( turnHandler );
GameScreen.setPutHandler( putHandler );
ResultScreen.setRestartHandler( restartHandler );

/**
 * Отправляет сообщение на сервер
 */
let sendMessage: typeof import( './connection.js' ).sendMessage;

/**
 * Устанавливает функцию отправки сообщений на сервер
 * 
 * @param sendMessageFunction Функция отправки сообщений
 */
function setSendMessage( sendMessageFunction: typeof sendMessage ): void
{
	sendMessage = sendMessageFunction;
}

/**
 * Обрабатывает ход игрока
 *
 * @param move
 */
function turnHandler( move: GameMove ): void
{
	sendMessage( {
		type: 'playerRoll',
		move
	} );
}

function putHandler( move: GamePut ): void
{
	sendMessage( {
		type: 'playerPut',
		move
	} );
}

/**
 * Обрабатывает перезапуск игры
 */
function restartHandler(): void
{
	sendMessage( {
		type: 'repeatGame',
	} );
}

/**
 * Начинает игру
 */
function startGame(): void
{
	openScreen( 'game' );
}

/**
 * Меняет активного игрока
 *
 * @param myTurn Ход текущего игрока?
 * @param gameField
 * @param gameFieldOpposite
 * @param state
 */
function changePlayer( myTurn: boolean, gameField: Array<Array<Cell>>, gameFieldOpposite: Array<Array<Cell>>, state: GameState ): void
{
	GameScreen.update( myTurn, gameField, gameFieldOpposite,  state );
}

function resultPut( state: GameState, myTurn: boolean ): void
{
	GameScreen.updateState( state, myTurn );
}

/**
 * Завершает игру
 * 
 * @param result Результат игры
 */
function endGame( result: 'win' | 'loose' | 'abort' ): void
{
	ResultScreen.update( result );
	openScreen( 'result' );
}

export {
	startGame,
	changePlayer,
	resultPut,
	endGame,
	setSendMessage,
};
