// Constants for IPC communication
const MSFT_OPCODE = {
    OPEN_LOGIN: 'msft_open_login',
    OPEN_LOGOUT: 'msft_open_logout',
    REPLY_LOGIN: 'msft_reply_login',
    REPLY_LOGOUT: 'msft_reply_logout'
};

const MSFT_REPLY_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error'
};

const MSFT_ERROR = {
    ALREADY_OPEN: 'already_open',
    NOT_FINISHED: 'not_finished'
};

const SHELL_OPCODE = {
    TRASH_ITEM: 'shell_trash_item'
};

const AZURE_CLIENT_ID = '00000000-0000-0000-0000-000000000000'; // Replace with your Azure client ID

module.exports = {
    AZURE_CLIENT_ID,
    MSFT_OPCODE,
    MSFT_REPLY_TYPE,
    MSFT_ERROR,
    SHELL_OPCODE
};