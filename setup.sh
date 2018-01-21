#!/bin/bash
# expected to run this after:
#   git clone "git://github.com/Aryailia/selfbot.git" "selfbot"
# and in the app folder "." where the clone takes place, not inside "./selfbot"


localFolder='selfbot' # the folder where the project was cloned into
# if you want spaces then you must backslash them

# More config stuff that you probably do not want to touch
config='config.js' # Should match config file name

# # do not need to use git clone (since get bash file post-download)
# # but useful to know for reference
# repository='git://github.com/Aryailia/selfbot.git' 
# git clone --recursive "$repository" "$localFolder"

if [ ! -f ".env" ]; then
  echo 'Creating .env file'
  (
  echo '# Environment Config'
  echo ''
  echo '# store your secrets and config variables in here'
  echo '# only invited collaborators will be able to see your .env values'
  echo ''
  echo '# reference these in your code with process.env.SECRET'
  echo ''
  echo 'DEVELOPMENT=""'
  echo 'TOKEN=""'
  echo 'ECHO_TOKEN=""'
  echo 'SELF_ID=""'
  echo ''
  echo 'NOTIFY_SERVER=""'
  echo 'NOTIFY_CHANNEL=""'
  echo 'LANGUAGE_SERVER_ID=""'
  echo ''
  echo ''
  echo '# note: .env is a shell file so there cannot be spaces around ='
  )>'.env'
else
  echo 'Not creating .env because it already exists'
fi

echo "Do you want remove the current installation?"
select yn in "Yes" "No"; do
  case $yn in
    Yes )
      # https://unix.stackexchange.com/a/77313
      # delete the folders in current directory and their contents
      printf "\nDelete everything but .env and $config files\n"
      find . ! -name '.' ! -name '.env' ! -name "$config" ! -name "$localFolder" -maxdepth 1 -exec rm -rf {} +       

      # Move everything out of localFolder and remove it
      # mv -vn $localFolder/{..?*,.[!.]*,[!config.js]*} .
      printf "\nMoving all files from $localFolder into current directory\n"
      printf "This should be where you git cloned to, you'll have to change inside setup.sh\n"
      printf "Not sure how to make the following command not give errors\n"
      find "./$localFolder" ! -name "$localFolder"  ! -name 'config.js' -exec mv {} . \;

      # Move config if it does not exist, not using -n because want to echo
      if [ -f ".config.js" ]; then
        printf "\nCopying default config file\n"
        mv $localFolder/$config .
      else
        printf "\nSince '$config' already exists, did not copy it\n"
      fi

      printf '\nCleaning up. All the files that were not copied over and are now deleted:\n'
      rm -rfv $localFolder

      printf '\nInstall npm packages\n'
      npm install --production
      break;;
    No ) printf '\nInstallation halted\n'; break;;
  esac
done


