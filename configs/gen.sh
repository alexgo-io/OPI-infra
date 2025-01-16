#!/usr/bin/env bash
set -Eeo pipefail

DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd $DIR

# genearte env file for bitmap_api
: '
# .env file
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""
DB_SSL="true"
DB_MAX_CONNECTIONS=10

API_HOST="127.0.0.1"
API_PORT="8001"
API_TRUSTED_PROXY_CNT="0"
'

generate_env_bitmap_api() {
    mkdir -p bitmap_api
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""
        echo "DB_SSL=\"${DB_SSL:-true}\""
        echo "DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS:-10}"

        echo "API_HOST=\"${API_HOST:-127.0.0.1}\""
        echo "API_PORT=\"${API_PORT:-8001}\""
        echo "API_TRUSTED_PROXY_CNT=\"${API_TRUSTED_PROXY_CNT:-0}\""
    } >"bitmap_api/.env"
}

# generate env file for bitmap_index
: '
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""

DB_METAPROTOCOL_USER="postgres"
DB_METAPROTOCOL_HOST="localhost"
DB_METAPROTOCOL_PORT="5432"
DB_METAPROTOCOL_DATABASE="postgres"
DB_METAPROTOCOL_PASSWD=""

NETWORK_TYPE="mainnet"

## reporting system settings
REPORT_TO_INDEXER="true"
REPORT_URL="https://api.opi.network/report_block"
REPORT_RETRIES="10"
# set a name for report dashboard
REPORT_NAME="opi_bitmap_index"
'

generate_env_bitmap_index() {
    mkdir -p bitmap_index
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""

        echo "DB_METAPROTOCOL_USER=\"${DB_METAPROTOCOL_USER:-postgres}\""
        echo "DB_METAPROTOCOL_HOST=\"${DB_METAPROTOCOL_HOST:-localhost}\""
        echo "DB_METAPROTOCOL_PORT=\"${DB_METAPROTOCOL_PORT:-5432}\""
        echo "DB_METAPROTOCOL_DATABASE=\"${DB_METAPROTOCOL_DATABASE:-postgres}\""
        echo "DB_METAPROTOCOL_PASSWD=\"${DB_METAPROTOCOL_PASSWD}\""

        echo "NETWORK_TYPE=\"${NETWORK_TYPE:-mainnet}\""

        echo "REPORT_TO_INDEXER=\"${REPORT_TO_INDEXER:-true}\""
        echo "REPORT_URL=\"${REPORT_URL:-https://api.opi.network/report_block}\""
        echo "REPORT_RETRIES=\"${REPORT_RETRIES:-10}\""
        if [ -z "$REPORT_NAME_BITMAP" ]
        then
          if [ -z "$REPORT_NAME" ]
          then
            echo "REPORT_NAME=\"alex_opi_bitmap_index\""
          else
            echo "REPORT_NAME=\"${REPORT_NAME}_bitmap\""
          fi
        else
          echo "REPORT_NAME=\"${REPORT_NAME_BITMAP}\""
        fi
    } >"bitmap_index/.env"
}

# generate env file for brc20_api
: '
# .env file
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""
DB_SSL="true"
DB_MAX_CONNECTIONS=10

API_HOST="127.0.0.1"
API_PORT="8000"
API_TRUSTED_PROXY_CNT="0"

USE_EXTRA_TABLES="true"
'
generate_env_brc20_api() {
    mkdir -p brc20_api
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""
        echo "DB_SSL=\"${DB_SSL:-true}\""
        echo "DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS:-10}"

        echo "API_HOST=\"${API_HOST:-127.0.0.1}\""
        echo "API_PORT=\"${API_PORT:-8000}\""
        echo "API_TRUSTED_PROXY_CNT=\"${API_TRUSTED_PROXY_CNT:-0}\""

        echo "USE_EXTRA_TABLES=\"${USE_EXTRA_TABLES:-true}\""
    } >"brc20_api/.env"
}

# genearte env file for brc20_index
: '
# .env
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""

## main indexer database settings
DB_METAPROTOCOL_USER="postgres"
DB_METAPROTOCOL_HOST="localhost"
DB_METAPROTOCOL_PORT="5432"
DB_METAPROTOCOL_DATABASE="postgres"
DB_METAPROTOCOL_PASSWD=""

NETWORK_TYPE="mainnet"

## reporting system settings
REPORT_TO_INDEXER="true"
REPORT_URL="https://api.opi.network/report_block"
REPORT_RETRIES="10"
# set a name for report dashboard
REPORT_NAME="opi_brc20_index"

# create brc20_current_balances and brc20_unused_tx_inscrs tables
CREATE_EXTRA_TABLES="true"
'
generate_env_brc20_index() {
    mkdir -p brc20_index
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""

        echo "DB_METAPROTOCOL_USER=\"${DB_METAPROTOCOL_USER:-postgres}\""
        echo "DB_METAPROTOCOL_HOST=\"${DB_METAPROTOCOL_HOST:-localhost}\""
        echo "DB_METAPROTOCOL_PORT=\"${DB_METAPROTOCOL_PORT:-5432}\""
        echo "DB_METAPROTOCOL_DATABASE=\"${DB_METAPROTOCOL_DATABASE:-postgres}\""
        echo "DB_METAPROTOCOL_PASSWD=\"${DB_METAPROTOCOL_PASSWD}\""

        echo "NETWORK_TYPE=\"${NETWORK_TYPE:-mainnet}\""

        echo "REPORT_TO_INDEXER=\"${REPORT_TO_INDEXER:-true}\""
        echo "REPORT_URL=\"${REPORT_URL:-https://api.opi.network/report_block}\""
        echo "REPORT_RETRIES=\"${REPORT_RETRIES:-10}\""
        if [ -z "$REPORT_NAME_BRC20" ]
        then
          if [ -z "$REPORT_NAME" ]
          then
            echo "REPORT_NAME=\"alex_opi_brc20_index\""
          else
            echo "REPORT_NAME=\"${REPORT_NAME}_brc20\""
          fi
        else
          echo "REPORT_NAME=\"${REPORT_NAME_BRC20}\""
        fi
    } >"brc20_index/.env"
}

# generate env file for main_index
: '
# .env file
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""
DB_SSL="true"
DB_MAX_CONNECTIONS=50

BITCOIN_CHAIN_FOLDER="~/.bitcoin/"
COOKIE_FILE=""

# leave these empty to use .cookie file
BITCOIN_RPC_USER=""
BITCOIN_RPC_PASSWD=""
# `--rpc-url` parameter for `ord`, example: `127.0.0.1:8332`
BITCOIN_RPC_URL=""

# change to ord.exe on Windows (without ./)
ORD_BINARY="./ord"

# leave default if repository folder structure hasnt been changed
ORD_FOLDER="../../ord/target/release/"
# relative to ord folder
ORD_DATADIR="."

NETWORK_TYPE="mainnet"
'

generate_env_main_index() {
    mkdir -p main_index

    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""
        echo "DB_SSL=\"${DB_SSL:-true}\""
        echo "DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS:-50}"

        echo "BITCOIN_CHAIN_FOLDER=\"${BITCOIN_CHAIN_FOLDER:-~/.bitcoin/}\""
        echo "COOKIE_FILE=\"${COOKIE_FILE}\""
        echo "BITCOIN_RPC_USER=\"${BITCOIN_RPC_USER}\""
        echo "BITCOIN_RPC_PASSWD=\"${BITCOIN_RPC_PASSWD}\""
        echo "BITCOIN_RPC_URL=\"${BITCOIN_RPC_URL}\""

        echo "ORD_BINARY=\"${ORD_BINARY:-./ord}\""
        echo "ORD_FOLDER=\"${ORD_FOLDER:-../../ord/target/release/}\""
        echo "ORD_DATADIR=\"${ORD_DATADIR:-.}\""

        echo "NETWORK_TYPE=\"${NETWORK_TYPE:-mainnet}\""
    } >"main_index/.env"
}

# genearte env file for sns_api
: '
# .env file
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""
DB_SSL="true"
DB_MAX_CONNECTIONS=10

API_HOST="127.0.0.1"
API_PORT="8002"
API_TRUSTED_PROXY_CNT="0"
'
generate_env_sns_api() {
    mkdir -p sns_api
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""
        echo "DB_SSL=\"${DB_SSL:-true}\""
        echo "DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS:-10}"

        echo "API_HOST=\"${API_HOST:-127.0.0.1}\""
        echo "API_PORT=\"${API_PORT:-8002}\""
        echo "API_TRUSTED_PROXY_CNT=\"${API_TRUSTED_PROXY_CNT:-0}\""
    } >"sns_api/.env"
}

# generate env file for sns_index
: '
# .env
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""

DB_METAPROTOCOL_USER="postgres"
DB_METAPROTOCOL_HOST="localhost"
DB_METAPROTOCOL_PORT="5432"
DB_METAPROTOCOL_DATABASE="postgres"
DB_METAPROTOCOL_PASSWD=""

NETWORK_TYPE="mainnet"

## reporting system settings
REPORT_TO_INDEXER="true"
REPORT_URL="https://api.opi.network/report_block"
REPORT_RETRIES="10"
# set a name for report dashboard
REPORT_NAME="opi_sns_index"
'

generate_env_sns_index() {
    mkdir -p sns_index
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""

        echo "DB_METAPROTOCOL_USER=\"${DB_METAPROTOCOL_USER:-postgres}\""
        echo "DB_METAPROTOCOL_HOST=\"${DB_METAPROTOCOL_HOST:-localhost}\""
        echo "DB_METAPROTOCOL_PORT=\"${DB_METAPROTOCOL_PORT:-5432}\""
        echo "DB_METAPROTOCOL_DATABASE=\"${DB_METAPROTOCOL_DATABASE:-postgres}\""
        echo "DB_METAPROTOCOL_PASSWD=\"${DB_METAPROTOCOL_PASSWD}\""

        echo "NETWORK_TYPE=\"${NETWORK_TYPE:-mainnet}\""

        echo "REPORT_TO_INDEXER=\"${REPORT_TO_INDEXER:-true}\""
        echo "REPORT_URL=\"${REPORT_URL:-https://api.opi.network/report_block}\""
        echo "REPORT_RETRIES=\"${REPORT_RETRIES:-10}\""
        if [ -z "$REPORT_NAME_SNS" ]
        then
          if [ -z "$REPORT_NAME" ]
          then
            echo "REPORT_NAME=\"alex_opi_sns_index\""
          else
            echo "REPORT_NAME=\"${REPORT_NAME}_sns\""
          fi
        else
          echo "REPORT_NAME=\"${REPORT_NAME_SNS}\""
        fi
    } >"sns_index/.env"
}

# generate env file for pow20_index
: '
# .env
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""

DB_METAPROTOCOL_USER="postgres"
DB_METAPROTOCOL_HOST="localhost"
DB_METAPROTOCOL_PORT="5432"
DB_METAPROTOCOL_DATABASE="postgres"
DB_METAPROTOCOL_PASSWD=""

NETWORK_TYPE="mainnet"

## reporting system settings
REPORT_TO_INDEXER="true"
REPORT_URL="https://api.opi.network/report_block"
REPORT_RETRIES="10"
# set a name for report dashboard
REPORT_NAME="opi_pow20_index"
'
generate_env_pow20_index() {
    mkdir -p pow20_index
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""

        echo "DB_METAPROTOCOL_USER=\"${DB_METAPROTOCOL_USER:-postgres}\""
        echo "DB_METAPROTOCOL_HOST=\"${DB_METAPROTOCOL_HOST:-localhost}\""
        echo "DB_METAPROTOCOL_PORT=\"${DB_METAPROTOCOL_PORT:-5432}\""
        echo "DB_METAPROTOCOL_DATABASE=\"${DB_METAPROTOCOL_DATABASE:-postgres}\""
        echo "DB_METAPROTOCOL_PASSWD=\"${DB_METAPROTOCOL_PASSWD}\""

        echo "NETWORK_TYPE=\"${NETWORK_TYPE:-mainnet}\""

        echo "REPORT_TO_INDEXER=\"${REPORT_TO_INDEXER:-true}\""
        echo "REPORT_URL=\"${REPORT_URL:-https://api.opi.network/report_block}\""
        echo "REPORT_RETRIES=\"${REPORT_RETRIES:-10}\""
        echo "REPORT_NAME=\"${REPORT_NAME:-opi_pow20_index}\""
    } >"pow20_index/.env"
}

# generate env file for pow20_api
: '
# .env
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="postgres"
DB_PASSWD=""
DB_SSL="true"
DB_MAX_CONNECTIONS=10

API_HOST="127.0.0.1"
API_PORT="8003"
API_TRUSTED_PROXY_CNT="0"
'
generate_env_pow20_api() {
    mkdir -p pow20_api
    {
        echo "DB_USER=\"${DB_USER:-postgres}\""
        echo "DB_HOST=\"${DB_HOST:-localhost}\""
        echo "DB_PORT=\"${DB_PORT:-5432}\""
        echo "DB_DATABASE=\"${DB_DATABASE:-postgres}\""
        echo "DB_PASSWD=\"${DB_PASSWD}\""
        echo "DB_SSL=\"${DB_SSL:-true}\""
        echo "DB_MAX_CONNECTIONS=${DB_MAX_CONNECTIONS:-10}"

        echo "API_HOST=\"${API_HOST:-127.0.0.1}\""
        echo "API_PORT=\"${API_PORT:-8003}\""
        echo "API_TRUSTED_PROXY_CNT=\"${API_TRUSTED_PROXY_CNT:-0}\""
    } >"pow20_api/.env"
}

rm -rf bitmap_api
rm -rf bitmap_index
rm -rf brc20_api
rm -rf brc20_index
rm -rf main_index
rm -rf sns_api
rm -rf sns_index

generate_env_bitmap_api
generate_env_bitmap_index
generate_env_brc20_api
generate_env_brc20_index
generate_env_main_index
generate_env_sns_api
generate_env_sns_index
generate_env_pow20_index
generate_env_pow20_api

green() {
    echo -e "\033[32m$1\033[0m"
}
green "generated env files at $PWD"
