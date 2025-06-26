FROM ubuntu:20.04

# Install build tools
RUN apt-get update
RUN apt-get install -y curl g++ gcc git make
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - && apt-get install -y nodejs
RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get install -y haxe \
  && haxelib setup /usr/share/haxe/lib

# Download and build project
RUN git clone https://github.com/ibilon/Highlighter.git /usr/src/highlighter
WORKDIR /usr/src/highlighter
RUN git checkout d067d905af08aff8b5f4360c3ac8f140f4f42a2b
RUN npm install --save vscode-textmate@3.3.3 \
  && npm install \
  && echo 'y' | haxelib install build.hxml \
  && haxe build.hxml \
  && sed -i '1 i #!/usr/bin/env node' ./bin/highlighter.js \
  && chmod +x ./bin/highlighter.js \
  && ln -s /usr/src/highlighter/bin/highlighter.js /usr/local/bin/highlighter

# Install default VS Code syntaxes and themes
RUN git clone --depth 1 https://github.com/microsoft/vscode.git /usr/src/vscode
WORKDIR /usr/src/vscode
RUN mkdir /home/grammar /home/theme \
  && cp --no-clobber ./extensions/*/syntaxes/*.tmLanguage.json /home/grammar/ \
  && cp ./extensions/theme-defaults/themes/*.json /home/theme/

# Install Atom One Light/Dark themes
RUN git clone --depth 1 https://github.com/akamud/vscode-theme-onelight.git /usr/src/vscode-theme-onelight
WORKDIR /usr/src/vscode-theme-onelight
RUN cp ./themes/OneLight.json /home/theme/
RUN git clone --depth 1 https://github.com/akamud/vscode-theme-onedark.git /usr/src/vscode-theme-onedark
WORKDIR /usr/src/vscode-theme-onedark
RUN cp ./themes/OneDark.json /home/theme/

# Set container entry point command
WORKDIR /home
ENTRYPOINT ["/usr/local/bin/highlighter"]
