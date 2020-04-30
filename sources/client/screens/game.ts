import type { GameMove, Cell, GameState, GamePut } from '../../common/messages.js';

/**
 * Заголовок экрана
 */
const title = document.querySelector( 'main.game>h2' ) as HTMLHeadingElement;
let state :GameState = {
	playerReady: false,
	opponentReady: false
};
const board1 = document.getElementById('player1') as HTMLElement;
const board2 = document.getElementById('player2') as HTMLElement;

if ( !title )
{
	throw new Error( 'Can\'t find required elements on "game" screen' );
}

/**
 * Обработчик хода игрока
 */
type TurnHandler = ( move: GameMove ) => void;
type PutHandler = ( move: GamePut ) => void;


type ClickCallback = ( event: Event ) => void;
type GetCellClass = ( data: Cell ) => string;
/**
 * Обработчик хода игрока
 */
let turnHandler: TurnHandler;
let putHandler: PutHandler;

function createGameField (board: HTMLElement, name: string): void {
	let t_row: string = '';
	for(let i: number = 1; i <= 10; i++) {
		t_row = '<div class="row">';
		t_row += '<div class="cell cell-label">' + i + '</div>';
		for(let j: number = 1; j <= 10; j++)
		{
			t_row += '<div class="cell" id="' + name + '_' + i + '_' + j + '"></div>';
		}
		t_row += '</div>';
		board.innerHTML += t_row;
	}
}

function refillGameField(field: Array<Array<Cell>>, name: string, getClass: GetCellClass): void {
	let element: HTMLElement;
	let className: string = '';
	for(let i: number = 1; i <= 10; i++) {
		for(let j: number = 1; j <= 10; j++) {
			element = document.getElementById(name + '_' + i + '_' + j)!;
			element.className = 'cell';
			className = getClass(field[i - 1][j - 1]);
			if(className.length !== 0)
				element.classList.add(className);
		}
	}
}

function getCellClass(data: Cell): string {
	let className: string = '';
	switch (data) {
		case 'S':
			className = 'ship';
			break;
		case 'X':
			className = 'damaged';
			break;
		case '*':
			className = 'missed';
			break;
	}
	return className;
}

function getOppositeCellClass(data: Cell): string {
	let className: string = '';
	switch (data) {
		case 'X':
			className = 'damaged';
			break;
		case '*':
			className = 'missed';
			break;
	}
	return className;
}

function addEvents(name: string, func: ClickCallback): void {
	for(let i: number = 1; i <= 10; i++) {
		for(let j: number = 1; j <= 10; j++) {
			document.getElementById(name + '_' + i + '_' + j)!.addEventListener('click', func);
		}
	}
}



createGameField(board1, board1.id);
createGameField(board2, board2.id);
addEvents(board1.id, onClick);
addEvents(board2.id, clickOpposite);


/**
 * Обрабатывает отправку формы
 * 
 * @param event Событие отправки
 */
function onClick( event: Event ): void
{
	const cell : HTMLElement = event.target as HTMLElement;
	if(cell.id.split('_')[0] === board1.id && state.playerReady)
		return;
	const row : number = Number(cell.id.split('_')[1]);
	const col : number = Number(cell.id.split('_')[2]);
	if(!state.playerReady || !state.opponentReady)
	{
		const move : GamePut = {
			type: 'PutShip',
			row: row,
			col: col
		};
		putHandler && putHandler( move );
		return;
	}
	
}

function clickOpposite( event: Event ): void
{
	const cell : HTMLElement = event.target as HTMLElement;
	const row : number = Number(cell.id.split('_')[1]);
	const col : number = Number(cell.id.split('_')[2]);
	if(!state.playerReady || !state.opponentReady)
		return;
	const move : GameMove = {
		type: 'GameMove',
		row: row,
		col: col
	};
	turnHandler && turnHandler( move );
}

/**
 * Обновляет экран игры
 *
 * @param myTurn Ход текущего игрока?
 * @param gameField
 * @param gameFieldOpposite
 * @param status
 */
function update( myTurn: boolean, gameField: Array<Array<Cell>>, gameFieldOpposite: Array<Array<Cell>>, status: GameState ): void
{
	state = status;
	refillGameField(gameField, 'player1', getCellClass);
	refillGameField(gameFieldOpposite, 'player2', getOppositeCellClass);
	if ( myTurn )
	{
		title.textContent = 'Ваш ход';
	} else
	{
		title.textContent = 'Ход противника';
	}

	if(!state.playerReady) {
		title.textContent = 'Поставьте корабли';
	} else if(!state.opponentReady) {
		title.textContent = 'Ожидайте соперника'
	}
}

function updateState( status : GameState, myTurn: boolean ): void {
	state = status;
	if (status.opponentReady && status.playerReady)
	{
		title.textContent = ( myTurn ? 'Ваш ход' : 'Ход соперника' );
	} else 
	{
		title.textContent = (!state.playerReady ? 'Поставьте корабли' : 'Ожидайте соперника');
	}
}

/**
 * Устанавливает обработчик хода игрока
 * 
 * @param handler Обработчик хода игрока
 */
function setPutHandler( handler: PutHandler ): void
{
	putHandler = handler;
}

function setTurnHandler( handler: TurnHandler ): void
{
	turnHandler = handler;
}



export {
	update,
	updateState,
	setTurnHandler,
	setPutHandler
};
