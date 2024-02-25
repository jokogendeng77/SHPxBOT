# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Attempting to run install-linux.sh again..."
    ./install-linux.sh
    exit 1
fi

# Check if the current version is the same as the git version
git fetch
localRev=$(git rev-parse HEAD)
remoteRev=$(git rev-parse @{u})

echo "Local revision: $localRev"
echo "Remote revision: $remoteRev"

if [ "$localRev" != "$remoteRev" ]; then
    echo "Updating to the latest version..."
    git stash
    git pull
    git stash apply
fi

npm install
node SHPBOT.js
