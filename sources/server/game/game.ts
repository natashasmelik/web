import WebSocket from 'ws';
import { onError } from './on-error.js';

import type {
	AnyClientMessage,
	AnyServerMessage,
	GameStartedMessage,
	GameAbortedMessage, GameMove, Cell, GamePut,
} from '../../common/messages.js';

/**
 * Класс игры
 * 
 * Запускает игровую сессию.
 */
class Game
{
	/**
	 * Количество игроков в сессии
	 */
	static readonly PLAYERS_IN_SESSION = 2;
	
	/**
	 * Игровая сессия
	 */
	private _session: WebSocket[];
	/**
	 * Информация о ходах игроков
	 */
	private _playersList!: WeakMap<WebSocket, Array<Array<Cell>> | null>;
	
	private _firstPlayerBoard!: Array<Array<Cell>>;
	private _secondPlayerBoard!: Array<Array<Cell>>;
	
	private _currentPlayer!: WebSocket;
	
	/**
	 * @param session Сессия игры, содержащая перечень соединений с игроками
	 */
	constructor( session: WebSocket[] )
	{
		this._session = session;
		this._sendStartMessage()
			.then(
				() =>
				{
					this._listenMessages();
				}
			)
			.catch( onError );
	}
	
	/**
	 * Уничтожает данные игровой сессии
	 */
	destroy(): void
	{
		// Можно вызвать только один раз
		this.destroy = () => {};
		
		for ( const player of this._session )
		{
			if (
				( player.readyState !== WebSocket.CLOSED )
				&& ( player.readyState !== WebSocket.CLOSING )
			)
			{
				const message: GameAbortedMessage = {
					type: 'gameAborted',
				};
				
				this._sendMessage( player, message )
					.catch( onError );
				player.close();
			}
		}
		
		// Обнуляем ссылки
		this._session = null as unknown as Game['_session'];
		this._playersList = null as unknown as Game['_playersList'];
	}
	
	private static _generateField(field: Array<Array<Cell>>): Array<Array<Cell>> {
		let tempField: Array<Array<Cell>> = field;
		for(let i: number = 0; i < 10; i++) {
			tempField.push([]);
			for(let j: number = 0; j < 10; j++) {
				tempField[i].push('');
			}
		}
		return tempField;
	}
	
	/**
	 * Отправляет сообщение о начале игры
	 */
	private _sendStartMessage(): Promise<void[]>
	{
		this._firstPlayerBoard = [];
		this._secondPlayerBoard = [];
		this._firstPlayerBoard = Game._generateField(this._firstPlayerBoard);
		this._secondPlayerBoard = Game._generateField(this._secondPlayerBoard);
		this._playersList = new WeakMap();
		const data: GameStartedMessage = {
			type: 'gameStarted',
			field: this._secondPlayerBoard,
			fieldOpposite: this._secondPlayerBoard,
			myTurn: true,
			state: {
				playerReady: false,
				opponentReady: false
			}
		};
		const promises: Promise<void>[] = [];
		
		let counter = 0;
		for ( const player of this._session )
		{
			counter++;
			if(counter === 1)
				this._currentPlayer = player;
			this._playersList.set(player, (counter === 1 ? this._firstPlayerBoard : this._secondPlayerBoard));
			data.field = this._playersList.get(player)!;
			promises.push( this._sendMessage( player, data ) );
			data.myTurn = false;
		}
		
		return Promise.all( promises );
	}
	
	/**
	 * Отправляет сообщение игроку
	 * 
	 * @param player Игрок
	 * @param message Сообщение
	 */
	private _sendMessage( player: WebSocket, message: AnyServerMessage ): Promise<void>
	{
		return new Promise(
			( resolve, reject ) =>
			{
				player.send(
					JSON.stringify( message ),
					( error ) =>
					{
						if ( error )
						{
							reject();
							
							return;
						}
						
						resolve();
					}
				)
			},
		);
	}
	
	/**
	 * Добавляет слушателя сообщений от игроков
	 */
	private _listenMessages(): void
	{
		for ( const player of this._session )
		{
			player.on(
				'message',
				( data ) =>
				{
					const message = this._parseMessage( data );
					
					this._processMessage( player, message );
				},
			);
			
			player.on( 'close', () => this.destroy() );
		}
	}
	
	/**
	 * Разбирает полученное сообщение
	 * 
	 * @param data Полученное сообщение
	 */
	private _parseMessage( data: unknown ): AnyClientMessage
	{
		if ( typeof data !== 'string' )
		{
			return {
				type: 'incorrectRequest',
				message: 'Wrong data type',
			};
		}
		
		try
		{
			return JSON.parse( data );
		}
		catch ( error )
		{
			return {
				type: 'incorrectRequest',
				message: 'Can\'t parse JSON data: ' + error,
			};
		}
	}
	
	/**
	 * Выполняет действие, соответствующее полученному сообщению
	 * 
	 * @param player Игрок, от которого поступило сообщение
	 * @param message Сообщение
	 */
	private _processMessage( player: WebSocket, message: AnyClientMessage ): void
	{
		switch ( message.type )
		{
			case 'playerRoll':
				this._onPlayerRoll( player, message.move );
				break;

			case 'playerPut':
				this._onPlayerPut( player, message.move );
				break;
			
			case 'repeatGame':
				this._sendStartMessage()
					.catch( onError );
				break;
			
			case 'incorrectRequest':
				this._sendMessage( player, message )
					.catch( onError );
				break;
			
			case 'incorrectResponse':
				console.error( 'Incorrect response: ', message.type );
				break;
			
			default:
				this._sendMessage(
					player,
					{
						type: 'incorrectRequest',
						message: `Unknown message type: "${(message as AnyClientMessage).type}"`,
					},
				)
					.catch( onError );
				break;
		}
	}

	private _onPlayerPut( currentPlayer: WebSocket, putMove: GamePut ): void
	{
		let field: Array<Array<Cell>> = this._playersList.get(currentPlayer)!;
		let fieldOpposite: Array<Array<Cell>> = field;
		
		let currentReady: boolean = false;
		let oppositeReady: boolean = false;
		let playerOpposite: WebSocket = currentPlayer;

		for ( const player of this._session )
		{
			if(player === currentPlayer)
			{
				currentReady = (Game._countPlayerShips(field) === 20);
			} else {
				fieldOpposite = this._playersList.get(player)!;
				oppositeReady = (Game._countPlayerShips(fieldOpposite) === 20);
				playerOpposite = player;
			}
		}

		if(oppositeReady && currentReady) {
			this._sendMessage(
				currentPlayer,
				{
					type: 'changePlayer',
					myTurn: (currentPlayer == this._currentPlayer),
					field: field,
					fieldOpposite: fieldOpposite,
					state: {
						playerReady: currentReady,
						opponentReady: oppositeReady
					}
				},
			)
				.catch( onError );
			
			this._sendMessage(
				playerOpposite,
				{
					type: 'resultPut',
					myTurn: (playerOpposite == this._currentPlayer),
					state: {
						playerReady: oppositeReady,
						opponentReady: currentReady
					}
				}
			)
				.catch( onError );
			return;
		}
		
		field[putMove.row - 1][putMove.col - 1] = 'S';
		
		currentReady = (Game._countPlayerShips(field) === 20);
		
		this._sendMessage(
			currentPlayer,
			{
				type: 'changePlayer',
				myTurn: (currentPlayer == this._currentPlayer),
				field: field,
				fieldOpposite: fieldOpposite,
				state: {
					playerReady: currentReady,
					opponentReady: oppositeReady
				}
			},
		)
			.catch( onError );
		
		this._sendMessage(
			playerOpposite,
			{
				type: 'resultPut',
				state: {
					playerReady: oppositeReady,
					opponentReady: currentReady
				},
				myTurn: (playerOpposite == this._currentPlayer),
			}
		)
			.catch( onError );
	}
	
	private static _countPlayerShips(field: Array<Array<Cell>>): number 
	{
		let counter:number = 0;
		for(let i: number = 0; i < 10; i++) {
			for (let j: number = 0; j < 10; j++) {
				counter += (field[i][j] === 'S' ? 1 : 0);
			}	
		}
		return counter;
	}
	
	/**
	 * Обрабатывает ход игрока
	 *
	 * @param currentPlayer Игрок, от которого поступило сообщение
	 * @param move
	 */
	private _onPlayerRoll( currentPlayer: WebSocket, move: GameMove ): void
	{
		
		if ( currentPlayer !== this._currentPlayer )
		{
			this._sendMessage(
				currentPlayer,
				{
					type: 'incorrectRequest',
					message: 'Not your turn',
				},
			)
				.catch( onError );
			return;
		}
		
		if(move.col < 1 || move.row > 10) 
		{
			this._sendMessage(
				currentPlayer,
				{
					type: 'incorrectRequest',
					message: 'Out of range',
				},
			)
				.catch( onError );
			return;
		}

		let field: Array<Array<Cell>> = this._firstPlayerBoard;
		
		let oppositePlayer: WebSocket = currentPlayer;
		for( const player of this._session )
		{
			if(player !== currentPlayer)
			{
				field = this._playersList.get(player)!;
				oppositePlayer = player;
			}
		}
		
		
		if(field[move.row - 1][move.col - 1] === 'X' || field[move.row - 1][move.col - 1] === '*')
		{
			this._sendMessage(
				currentPlayer,
				{
					type: 'incorrectRequest',
					message: 'You have already moved there',
				},
			)
				.catch( onError );
			return;
		}

		field[move.row - 1][move.col - 1] = (field[move.row - 1][move.col - 1] === 'S' ? 'X' : '*');
		
		let endGame: number = 0;
		
		for ( const player of this._session )
		{
			endGame += (Game._countPlayerShips(this._playersList.get(player)!) === 0) ? 1 : 0;
		}
		
		if(endGame)
		{
			for ( const player of this._session )
			{
				this._sendMessage(
					player,
					{
						type: 'gameResult',
						win: Game._countPlayerShips(this._playersList.get(player)!) !== 0,
					},
				)
					.catch( onError );
			}
			return;
		}

			
		this._currentPlayer = oppositePlayer;
		this._sendMessage(
			oppositePlayer,
			{
				type: 'changePlayer',
				myTurn: true,
				field: this._playersList.get(oppositePlayer)!,
				fieldOpposite: this._playersList.get(currentPlayer)!,
				state: {
					playerReady: true,
					opponentReady: true
				}
			},
		)
			.catch( onError );
		
		this._sendMessage(
			currentPlayer,
			{
				type: 'changePlayer',
				myTurn: false,
				field: this._playersList.get(currentPlayer)!,
				fieldOpposite: this._playersList.get(oppositePlayer)!,
				state: {
					playerReady: true,
					opponentReady: true
				}
			},
		)
			.catch( onError );
			
	}
}

export {
	Game,
};
