FROM ghcr.io/berriai/litellm:main

WORKDIR /app

COPY ../litellm-config.yaml /app/litellm-config.yaml

CMD ["sh", "-c", "litellm --config /app/litellm-config.yaml --port ${PORT:-4000} --host 0.0.0.0"]

