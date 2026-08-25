import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { User } from '../api/types';
import PlayfulStar from '../components/decor/PlayfulStar';
import { toast, useSession } from '../store/session';

export default function Login() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState<'login' | 'demo' | null>(null);

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async () => {
    if (!nickname.trim()) {
      toast('先给自己起个昵称吧');
      return;
    }
    setBusy('login');
    try {
      const payload: Record<string, unknown> = { nickname: nickname.trim() };
      if (gender) payload.gender = gender;
      if (age.trim()) payload.age = Number(age);
      if (city.trim()) payload.city = city.trim();
      const res = await api.post<{ user: User }>('/auth/login', payload);
      login(res.user);
      navigate('/', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : '登录失败');
    } finally {
      setBusy(null);
    }
  };

  const handleDemo = async () => {
    setBusy('demo');
    try {
      const res = await api.post<{ user: User }>('/auth/demo', {});
      login(res.user);
      navigate('/', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : '进入体验失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-hidden px-6 py-10">
      <div className="absolute left-8 top-20">
        <PlayfulStar size={16} rotation={-12} />
      </div>
      <div className="absolute bottom-24 right-10 opacity-80">
        <PlayfulStar size={11} rotation={20} color="#0F44A7" />
      </div>

      <header className="relative z-10 animate-rise-in text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-card bg-white text-3xl font-bold text-blue shadow-card">
          冊
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-wide text-blue-deep">人生 Attitude 册子</h1>
        <p className="mt-3 text-[15px] tracking-widest text-ink-4">先聊态度，再谈遇见</p>
      </header>

      <div className="relative z-10 mt-12 animate-rise-in space-y-3" style={{ animationDelay: '0.1s' }}>
        <input
          className="input-field"
          placeholder="你的昵称"
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <div className="flex gap-3">
          <select
            className="input-field flex-1 appearance-none"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            aria-label="性别（可选）"
          >
            <option value="">性别（可选）</option>
            <option value="female">女</option>
            <option value="male">男</option>
            <option value="other">其他</option>
          </select>
          <input
            className="input-field flex-1"
            placeholder="年龄（可选）"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <input
          className="input-field"
          placeholder="城市（可选）"
          value={city}
          maxLength={20}
          onChange={(e) => setCity(e.target.value)}
        />
        <button className="btn-primary w-full" onClick={handleLogin} disabled={busy !== null}>
          {busy === 'login' ? '进入中…' : '开始记录我的态度'}
        </button>
      </div>

      <div className="relative z-10 mt-8 animate-rise-in text-center" style={{ animationDelay: '0.2s' }}>
        <div className="mb-4 flex items-center gap-3 text-xs text-ink-5">
          <span className="h-px flex-1 bg-border-soft" />
          或者
          <span className="h-px flex-1 bg-border-soft" />
        </div>
        <button
          className="btn-ghost w-full border-blue/40 text-blue-deep hover:bg-blue/5"
          onClick={handleDemo}
          disabled={busy !== null}
        >
          {busy === 'demo' ? '准备中…' : '✦ 一键体验（演示账号「晨曦」）'}
        </button>
      </div>
    </div>
  );
}
