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
      const demo = params.get('demo') === '1' || process.env.NODE_ENV === 'development';
      
      for (let i = 0; i < 10; i++) {
        try {
          const wa = (window as any)?.Telegram?.WebApp;
          if (wa) {
            wa.ready();
            wa.expand?.();
            
            const hasInit = typeof wa.initData === 'string' && wa.initData.length > 0;
            const user = wa.initDataUnsafe?.user;
            
            if (!cancelled) {
              if (hasInit || demo) {
                setEnv('telegram');
                
                if (user) {
                  const firstName = user.first_name || '';
                  const lastName = user.last_name || '';
                  const username = user.username || '';
                  const fullName = [firstName, lastName].filter(Boolean).join(' ');
                  const displayName = fullName || username || (demo ? 'Друг' : 'Пользователь');
                  
                  setUserData({
                    name: displayName,
                    username: username ? `@${username}` : '',
                    fullName,
                    firstName,
                    lastName,
                    userId: user.id
                  });
                } else if (demo) {
                  setUserData({
                    name: 'Друг',
                    username: '',
                    fullName: 'Друг',
                    firstName: 'Друг',
                    userId: 0
                  });
                }
              } else {
                setEnv('browser');
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
          setUserData({
            name: 'Друг',
            username: '',
            fullName: 'Друг',
            firstName: 'Друг',
            userId: 0
          });
        }
      }
    };

    detectTelegram().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
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
