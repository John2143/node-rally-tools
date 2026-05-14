{
  description = "Rally Tools CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.buildNpmPackage {
          pname = "rally-tools";
          version = "8.6.3";

          src = ./.;

          npmDepsHash = "sha256-oI1RnSQI1APv8UlvlO61hJvTa/SrcHUrIhIjq7QjVYU=";

          npmBuildScript = "build";

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin $out/lib/rally-tools
            cp -r node_modules $out/lib/rally-tools/
            cp bundle.js bundle.js.map package.json $out/lib/rally-tools/

            makeWrapper ${pkgs.nodejs}/bin/node $out/bin/rally \
              --add-flags "$out/lib/rally-tools/bundle.js"

            runHook postInstall
          '';

          nativeBuildInputs = [ pkgs.makeWrapper ];

          meta = {
            description = "The rally tools CLI interface";
            license = pkgs.lib.licenses.mit;
            mainProgram = "rally";
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
          ];
        };
      });
}
