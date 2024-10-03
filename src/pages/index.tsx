import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Volume2, Pause, Play, User, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useTheme } from 'next-themes';

interface Sound {
  messageId: string;
  url: string;
  volume: number;
  channelId: string;
}

interface SoundList {
  [key: string]: Sound;
}

interface UserInfo {
  id: string;
  username: string;
  avatar: string;
}

const DISCORD_CLIENT_ID = '1291400589531676694';
const REDIRECT_URI = 'http://localhost:3000';
const GUILD_ID = '675890476079120394';

export default function SoundApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [soundList, setSoundList] = useState<SoundList>({});
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { theme, setTheme } = useTheme();

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      setUserInfo({
        id: data.id,
        username: data.username,
        avatar: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`,
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    setMounted(true);

    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
      localStorage.setItem('discord_token', accessToken);
      setIsLoggedIn(true);
      fetchUserInfo(accessToken);
    }

    const storedToken = localStorage.getItem('discord_token');
    if (storedToken) {
      setIsLoggedIn(true);
      fetchUserInfo(storedToken);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSoundList();
    }
  }, [isLoggedIn]);

  const ThemeToggle = () => {
    if (!mounted) return null;

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    );
  };

  if (!mounted) {
    return null;
  }

  const handleLogin = () => {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = discordAuthUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('discord_token');
    setIsLoggedIn(false);
    setSoundList({});
    setError(null);
    setUserInfo(null);
  };

  const fetchSoundList = async () => {
    try {
      setError(null);
      const response = await fetch(`https://go-ebening:8080/?guildID=${GUILD_ID}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSoundList(data.soundList || {});
    } catch (error) {
      console.error('Error fetching sound list:', error);
      setError('Failed to fetch sound list. Please try again later.');
    }
  };

  const playSound = (key: string, sound: Sound) => {
    if (audioRef.current) {
      if (currentlyPlaying === key) {
        audioRef.current.pause();
        setCurrentlyPlaying(null);
      } else {
        audioRef.current.src = sound.url;
        audioRef.current.play();
        setCurrentlyPlaying(key);
      }
    }
  };

  const updateProgress = () => {
    if (audioRef.current) {
      const percentage = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(percentage) ? 0 : percentage);
    }
  };

  const getMessageUrl = (sound: Sound) => {
    return `https://discord.com/channels/${GUILD_ID}/${sound.channelId}/${sound.messageId}`;
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          {userInfo && (
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={userInfo.avatar} alt={userInfo.username} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{userInfo.username}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isLoggedIn ? (
              <Button onClick={handleLogin}>Login with Discord</Button>
            ) : (
              <Button onClick={handleLogout} variant="destructive">Logout</Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      {isLoggedIn && (
        <>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search sounds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(soundList)
              .filter(([key]) => key.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(([key, sound]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:bg-accent ${currentlyPlaying === key ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => playSound(key, sound)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                      {key}
                      {currentlyPlaying === key ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <span>{!sound.volume ? "Default" : String(sound.volume)}</span>
                    </div>
                    <a
                      href={getMessageUrl(sound)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-sm text-blue-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View in Discord
                    </a>
                    <div className={`transition-all ${currentlyPlaying === key ? 'opacity-100' : 'opacity-0'}`}>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <audio
            ref={audioRef}
            onEnded={() => {
              setCurrentlyPlaying(null);
              setProgress(0);
            }}
            onTimeUpdate={updateProgress}
          />
        </>
      )}
    </div>
  );

}