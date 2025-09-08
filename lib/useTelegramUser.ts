import { useEffect, useState, useMemo } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramUserData {
  name: string;
  username: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  userId: number;
}

export function useTelegramUser() {
  const [userData, setUserData] = useState<TelegramUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [env, setEnv] = useState<'loading' | 'telegram' | 'browser'>('loading');

  useEffect(() => {
    let cancelled = false;
    
    const detectTelegram = async () => {
      // Проверяем, находимся ли мы в режиме разработки
      const params = new URLSearchParams(window.location.search);
      const isDev = process.env.NODE_ENV === 'development' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('localhost');
      const demo = params.get('demo') === '1' || isDev;
      
      console.log('Detecting Telegram WebApp, demo mode:', demo);
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('Hostname:', window.location.hostname);
      console.log('URL params:', window.location.search);
      
      for (let i = 0; i < 10; i++) {
        try {
          const wa = (window as any)?.Telegram?.WebApp;
          console.log('Telegram WebApp attempt', i, 'wa:', !!wa);
          
          if (wa) {
            wa.ready();
            wa.expand?.();
            
            const hasInit = typeof wa.initData === 'string' && wa.initData.length > 0;
            const user = wa.initDataUnsafe?.user;
            
            console.log('Telegram WebApp found:', { hasInit, user });
            
            if (!cancelled) {
              if (hasInit || demo) {
                setEnv('telegram');
                
                if (user) {
                  const firstName = user.first_name || '';
                  const lastName = user.last_name || '';
                  const username = user.username || '';
                  const fullName = [firstName, lastName].filter(Boolean).join(' ');
                  const displayName = fullName || username || (demo ? 'Друг' : 'Пользователь');
                  
                  const userData = {
                    name: displayName,
                    username: username ? `@${username}` : '',
                    fullName,
                    firstName,
                    lastName,
                    userId: user.id
                  };
                  
                  console.log('Setting user data:', userData);
                  setUserData(userData);
                } else if (demo) {
                  const demoUserData = {
                    name: 'Друг',
                    username: '',
                    fullName: 'Друг',
                    firstName: 'Друг',
                    userId: 0
                  };
                  console.log('Setting demo user data:', demoUserData);
                  setUserData(demoUserData);
                }
              } else {
                setEnv('browser');
                console.log('Set env to browser');
              }
            }
            return;
          }
        } catch (error) {
          console.warn('Telegram WebApp detection error:', error);
        }
        
        await new Promise(r => setTimeout(r, 100));
      }
      
      if (!cancelled) {
        setEnv(demo ? 'telegram' : 'browser');
        if (demo) {
          const demoUserData = {
            name: 'Друг',
            username: '',
            fullName: 'Друг',
            firstName: 'Друг',
            userId: 0
          };
          console.log('Setting demo user data (fallback):', demoUserData);
          setUserData(demoUserData);
        } else {
          // Если не в режиме разработки и Telegram WebApp не найден, устанавливаем null
          console.log('No Telegram WebApp found, setting userData to null');
          setUserData(null);
        }
        console.log('Final env set to:', demo ? 'telegram' : 'browser');
      }
    };

    detectTelegram().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
        console.log('Telegram detection finished, isLoading set to false');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    userData,
    isLoading,
    env,
    isTelegram: env === 'telegram',
    isBrowser: env === 'browser'
  };
}
