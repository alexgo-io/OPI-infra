FROM python:3.9.18-bookworm

ENV NODE_MAJOR=20 \
  RUSTUP_HOME=/usr/local/rustup \
  CARGO_HOME=/usr/local/cargo \
  PATH=$PATH:/usr/local/cargo/bin:/usr/local/OPI/ord/target/release \
  RUST_VERSION=1.75.0 \
  OPI_COMMIT_HASH=61bf0a747129e31341b0d99ceebefadd2640c4a7

RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		build-essential \
		ca-certificates \
		curl \
		gnupg \
		wget \
		git \
        pbzip2 \
	; \
	rm -rf /var/lib/apt/lists/*

# install nodejs
RUN set -eux; \
	mkdir -p /etc/apt/keyrings; \
	curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg; \
	echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list; \
	apt-get update; \
	apt-get install nodejs -y; \
	rm -rf /var/lib/apt/lists/*

# install rust
RUN set -eux; \
    dpkgArch="$(dpkg --print-architecture)"; \
    case "${dpkgArch##*-}" in \
        amd64) rustArch='x86_64-unknown-linux-gnu'; rustupSha256='0b2f6c8f85a3d02fde2efc0ced4657869d73fccfce59defb4e8d29233116e6db' ;; \
        armhf) rustArch='armv7-unknown-linux-gnueabihf'; rustupSha256='f21c44b01678c645d8fbba1e55e4180a01ac5af2d38bcbd14aa665e0d96ed69a' ;; \
        arm64) rustArch='aarch64-unknown-linux-gnu'; rustupSha256='673e336c81c65e6b16dcdede33f4cc9ed0f08bde1dbe7a935f113605292dc800' ;; \
        i386) rustArch='i686-unknown-linux-gnu'; rustupSha256='e7b0f47557c1afcd86939b118cbcf7fb95a5d1d917bdd355157b63ca00fc4333' ;; \
        *) echo >&2 "unsupported architecture: ${dpkgArch}"; exit 1 ;; \
    esac; \
    url="https://static.rust-lang.org/rustup/archive/1.26.0/${rustArch}/rustup-init"; \
    wget "$url"; \
    echo "${rustupSha256} *rustup-init" | sha256sum -c -; \
    chmod +x rustup-init; \
    ./rustup-init -y --no-modify-path --profile minimal --default-toolchain $RUST_VERSION --default-host ${rustArch}; \
    rm rustup-init; \
    chmod -R a+w $RUSTUP_HOME $CARGO_HOME; \
    rustup default stable; \
    rustup --version; \
    cargo --version; \
    rustc --version;

RUN pip install --no-cache-dir python-dotenv psycopg2 psycopg2-binary boto3 tqdm json5 stdiomask requests;

RUN git clone https://github.com/bestinslot-xyz/OPI.git /usr/local/OPI; \
    cd /usr/local/OPI; \
    git checkout $OPI_COMMIT_HASH; \
    cd /usr/local/OPI/ord; cargo build --release; \
	cd /usr/local/OPI/modules/main_index; npm install; \
	cd /usr/local/OPI/modules/brc20_api; npm install; \
	cd /usr/local/OPI/modules/bitmap_api; npm install; \
	cd /usr/local/OPI/modules/sns_api; npm install; \
	cd /usr/local/OPI/modules/pow20_api; npm install;

COPY remvoe_pubkey_validate.js /usr/local/OPI/modules/main_index
RUN node /usr/local/OPI/modules/main_index/remvoe_pubkey_validate.js && rm /usr/local/OPI/modules/main_index/remvoe_pubkey_validate.js
RUN mkdir /ord_data; mkdir -p /bitcoind
