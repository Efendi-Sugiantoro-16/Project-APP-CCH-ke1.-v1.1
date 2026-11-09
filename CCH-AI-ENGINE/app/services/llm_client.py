import os
import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("cch_ai_engine.llm")


class LLMClient:
    """
    Multi-Provider LLM Gateway dengan Fallback Cascade Otomatis & Dynamic Model Name.
    Mendukung:
    1. OpenAI (gpt-4o-mini / gpt-4o / o3-mini)
    2. Google Gemini (gemini-1.5-flash / gemini-2.0-flash)
    3. Mistral AI (mistral-small-latest / codestral-latest)
    4. DeepSeek (deepseek-chat / deepseek-reasoner)
    5. Local Ollama (qwen2.5:7b / llama3.2)
    6. Rule-based NLU Fallback (100% offline & zero cost)
    """

    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self.mistral_key = settings.MISTRAL_API_KEY
        self.deepseek_key = settings.DEEPSEEK_API_KEY
        self.ollama_url = settings.LOCAL_OLLAMA_URL
        self.primary = settings.PRIMARY_LLM_PROVIDER

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.5,
        max_tokens: int = 500
    ) -> str:
        """
        Generate chat response with dynamic provider cascade.
        Tries primary provider first, then falls back through other configured providers.
        """
        providers_to_try = [self.primary]
        all_providers = ["openai", "gemini", "mistral", "deepseek", "ollama"]
        for p in all_providers:
            if p not in providers_to_try:
                providers_to_try.append(p)

        for provider in providers_to_try:
            try:
                if provider == "openai" and self.openai_key:
                    res = await self._call_openai(system_prompt, messages, temperature, max_tokens)
                    if res:
                        return res
                elif provider == "gemini" and self.gemini_key:
                    res = await self._call_gemini(system_prompt, messages, temperature, max_tokens)
                    if res:
                        return res
                elif provider == "mistral" and self.mistral_key:
                    res = await self._call_mistral(system_prompt, messages, temperature, max_tokens)
                    if res:
                        return res
                elif provider == "deepseek" and self.deepseek_key:
                    res = await self._call_deepseek(system_prompt, messages, temperature, max_tokens)
                    if res:
                        return res
                elif provider == "ollama" and self.ollama_url:
                    res = await self._call_ollama(system_prompt, messages, temperature, max_tokens)
                    if res:
                        return res
            except Exception as e:
                logger.warning(f"Provider {provider} failed: {e}")
                continue

        # Final safety net: Rule-based fallback
        logger.info("Using Rule-based NLU fallback response generator.")
        return self._generate_fallback(messages)

    async def _call_openai(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> Optional[str]:
        api_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            api_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.OPENAI_MODEL,
                    "messages": api_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(f"OpenAI error {resp.status_code}: {resp.text}")
                return None

    async def _call_gemini(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> Optional[str]:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={self.gemini_key}"
        
        contents = []
        for m in messages:
            role = "user" if m.get("role") in ("user", "system") else "model"
            contents.append({
                "role": role,
                "parts": [{"text": m.get("content", "")}]
            })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                endpoint,
                headers={"Content-Type": "application/json"},
                json=payload
            )
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
                return None
            else:
                logger.warning(f"Gemini error {resp.status_code}: {resp.text}")
                return None

    async def _call_mistral(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> Optional[str]:
        api_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            api_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.mistral_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.MISTRAL_MODEL,
                    "messages": api_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(f"Mistral error {resp.status_code}: {resp.text}")
                return None

    async def _call_deepseek(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> Optional[str]:
        api_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            api_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.deepseek_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": api_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(f"DeepSeek error {resp.status_code}: {resp.text}")
                return None

    async def _call_ollama(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> Optional[str]:
        api_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            api_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        endpoint = f"{self.ollama_url.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                endpoint,
                headers={"Content-Type": "application/json"},
                json={
                    "model": settings.LOCAL_OLLAMA_MODEL,
                    "messages": api_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                return None

    def _generate_fallback(self, messages: List[Dict[str, str]]) -> str:
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "").lower()
                break

        if "resi" in last_user_msg or "pos" in last_user_msg:
            return (
                "Halo Sahabat Pos, terima kasih telah menghubungi Pos Indonesia. "
                "Untuk pelacakan nomor kiriman (resi), mohon pastikan nomor resi valid (contoh: POS123456789ID atau P2408290039578). "
                "Petugas Customer Care kami di UPT tujuan siap membantu investigasi fisik barang Anda."
            )
        elif "rusak" in last_user_msg or "pecah" in last_user_msg:
            return (
                "Mohon maaf mendalam atas kendala kiriman yang rusak. "
                "Pengaduan Anda dapat segera dicatat di sistem CCH. Mohon simpan foto fisik kemasan, isi kiriman, serta nomor barcode resi untuk pengajuan klaim ganti rugi."
            )
        elif "hilang" in last_user_msg:
            return (
                "Kami memohon maaf atas kiriman yang belum kunjung tiba. "
                "Tiket pengaduan kategori Kiriman Hilang/Tercecer akan segera dieskalasikan ke Bagian Pemeriksaan Operasional Regional untuk pelacakan manifest."
            )
        return (
            "Halo Sahabat Pos, Customer Service Virtual Pos Indonesia siap membantu kendala kiriman pos, "
            "informasi layanan pos kilat khusus, express, maupun tindak lanjut tiket pengaduan CCH Anda."
        )


llm_client = LLMClient()
