export type Cell = 'S' | 'X' | '*' | '';

export type GameState = {
	playerReady: boolean;
	opponentReady: boolean;
};

/**
 * Начало игры
 */
export type GameStartedMessage = {
	/** Тип сообщения */
	type: 'gameStarted';
	field: Array<Array<Cell>>;
	fieldOpposite: Array<Array<Cell>>;
	/** Мой ход? */
	myTurn: boolean;
	state: GameState;
};

export type GameMove = {
	type: 'GameMove',
	row: number,
	col: number
};

export type GamePut = {
	type: 'PutShip',
	row: number,
	col: number
};

/**
 * Игра прервана
 */
export type GameAbortedMessage = {
	/** Тип сообщения */
	type: 'gameAborted';
};

/**
 * Ход игрока
 */
export type PlayerRollMessage = {
	/** Тип сообщения */
	type: 'playerRoll';
	/** Число, названное игроком */
	move: GameMove;
};

export type PlayerPutMessage = {
	/** Тип сообщения */
	type: 'playerPut';
	/** Число, названное игроком */
	move: GamePut;
};

/**
 * Результат хода игроков
 */
export type GameResultMessage = {
	/** Тип сообщения */
	type: 'gameResult';
	/** Победа? */
	win: boolean;
};

/**
 * Смена игрока
 */
export type ChangePlayerMessage = {
	/** Тип сообщения */
	type: 'changePlayer';
	/**/
	field: Array<Array<Cell>>;
	fieldOpposite: Array<Array<Cell>>;
	/** Мой ход? */
	myTurn: boolean;
	state: GameState;
};

export type ChangeGameStatusMessage = {
	/** Тип сообщения */
	type: 'resultPut';
	/**/
	state: GameState;
	myTurn: boolean;
};

/**
 * Повтор игры
 */
export type RepeatGame = {
	/** Тип сообщения */
	type: 'repeatGame';
};

/**
 * Некорректный запрос клиента
 */
export type IncorrectRequestMessage = {
	/** Тип сообщения */
	type: 'incorrectRequest';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Некорректный ответ сервера
 */
export type IncorrectResponseMessage = {
	/** Тип сообщения */
	type: 'incorrectResponse';
	/** Сообщение об ошибке */
	message: string;
};

/**
 * Сообщения от сервера к клиенту
 */
export type AnyServerMessage =
	| GameStartedMessage
	| GameAbortedMessage
	| GameResultMessage
	| ChangePlayerMessage
	| IncorrectRequestMessage
	| IncorrectResponseMessage
	| PlayerPutMessage
	| GameMove
	| ChangeGameStatusMessage;

/** 
 * Сообщения от клиента к серверу
 */
export type AnyClientMessage =
	| PlayerRollMessage
	| RepeatGame
	| IncorrectRequestMessage
	| IncorrectResponseMessage
	| PlayerPutMessage
	| GameMove
	| GamePut
