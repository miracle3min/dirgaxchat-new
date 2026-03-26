'use client'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { EdgeSpeech } from '@xiangfa/polly'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  MonitorDown, RefreshCw, Globe, Brain, SlidersHorizontal, Mic, Info, Shield,
  Thermometer, Hash, Layers, MessageSquare, ChevronRight, X
} from 'lucide-react'
import { usePWAInstall } from 'react-use-pwa-install'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import Button from '@/components/Button'
import ResponsiveDialog from '@/components/ResponsiveDialog'
import i18n from '@/utils/i18n'
import locales from '@/constant/locales'
import { useSettingStore, useEnvStore } from '@/store/setting'
import { toPairs, values, omitBy, isFunction } from 'lodash-es'

import pkg from '@/package.json'

type SettingProps = {
  open: boolean
  hiddenTalkPanel?: boolean
  onClose: () => void
}

const formSchema = z.object({
  password: z.string().optional(),
  assistantIndexUrl: z.string().optional(),
  lang: z.string().optional(),
  apiKey: z.string().optional(),
  apiProxy: z.string().optional(),
  model: z.string(),
  maxHistoryLength: z.number().gte(0).lte(50).optional().default(0),
  topP: z.number(),
  topK: z.number(),
  temperature: z.number(),
  maxOutputTokens: z.number(),
  safety: z.enum(['none', 'low', 'middle', 'high']).default('none'),
  sttLang: z.string().optional(),
  ttsLang: z.string().optional(),
  ttsVoice: z.string().optional(),
  autoStartRecord: z.boolean().default(false),
  autoStopRecord: z.boolean().default(false),
})

/* ───── Sidebar menu items ───── */
type MenuItem = {
  id: string
  icon: React.ElementType
  labelKey: string
}

const menuItems: MenuItem[] = [
  { id: 'general', icon: Globe, labelKey: 'generalSetting' },
  { id: 'params', icon: SlidersHorizontal, labelKey: 'modelParams' },
  { id: 'voice', icon: Mic, labelKey: 'voiceServer' },
]

/* ───── Section wrapper ───── */
function SettingSection({ icon: Icon, title, description, children }: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/40">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 pl-0.5">{children}</div>
    </div>
  )
}

/* ───── Modern slider with value badge ───── */
function SliderField({ value, max, step, unit, onChange }: {
  value: number; max: number; step: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div className="col-span-3 flex items-center gap-3">
      <Slider className="flex-1" value={[value]} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
      <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary tabular-nums">
        {value}{unit || ''}
      </span>
    </div>
  )
}

/* ───── Safety pill selector ───── */
function SafetyPills({ value, onChange, labels }: {
  value: string; onChange: (v: string) => void; labels: Record<string, string>
}) {
  const levels = ['none', 'low', 'middle', 'high']
  const colors: Record<string, string> = {
    none: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    low: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    middle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    high: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  }
  return (
    <div className="col-span-3 flex flex-wrap gap-2">
      {levels.map((level) => (
        <button
          key={level} type="button" onClick={() => onChange(level)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
            value === level
              ? `${colors[level]} ring-1 ring-current/20 shadow-sm scale-105`
              : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-102'
          }`}
        >
          {labels[level]}
        </button>
      ))}
    </div>
  )
}

function Setting({ open, hiddenTalkPanel, onClose }: SettingProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const pwaInstall = usePWAInstall()
  const settingStore = useSettingStore()
  const { isProtected, buildMode } = useEnvStore()
  const [activeMenu, setActiveMenu] = useState<string>('general')
  const [ttsLang, setTtsLang] = useState<string>('')
  const [hiddenPasswordInput, setHiddenPasswordInput] = useState<boolean>(false)

  const voiceOptions = useMemo(() => {
    return new EdgeSpeech({ locale: ttsLang }).voiceOptions || []
  }, [ttsLang])

  const visibleMenuItems = useMemo(() => {
    if (hiddenTalkPanel) return menuItems.filter((item) => item.id !== 'voice')
    return menuItems
  }, [hiddenTalkPanel])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: omitBy(settingStore, (item) => isFunction(item)),
  })

  const handleTTSChange = (value: string) => {
    form.setValue('ttsLang', value)
    setTtsLang(value)
    const options = new EdgeSpeech({ locale: value }).voiceOptions
    if (options) form.setValue('ttsVoice', options[0].value)
  }

  const handleLangChange = (value: string) => {
    i18n.changeLanguage(value)
    form.setValue('lang', value)
    form.setValue('sttLang', value)
    handleTTSChange(value)
  }

  const LangOptions = () => {
    return toPairs(locales).map((kv) => (
      <SelectItem key={kv[0]} value={kv[0]}>{kv[1]}</SelectItem>
    ))
  }

  const handleReset = useCallback(() => {
    const { reset } = useSettingStore.getState()
    const defaultValues = reset()
    form.reset(defaultValues)
  }, [form])

  const handleSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      const { update } = useSettingStore.getState()
      update(values as Partial<Setting>)
      onClose()
    },
    [onClose],
  )

  const handlePwaInstall = useCallback(async () => {
    if ('serviceWorker' in navigator && window.serwist !== undefined) {
      await window.serwist.register()
    }
    if (pwaInstall) await pwaInstall()
  }, [pwaInstall])

  useLayoutEffect(() => {
    if (buildMode === 'export' || !isProtected) {
      setHiddenPasswordInput(true)
    }
  }, [buildMode, isProtected])

  /* ───── Panel content per menu ───── */
  const renderContent = () => {
    switch (activeMenu) {
      case 'general':
        return (
          <div className="space-y-6">
            <SettingSection icon={Globe} title={t('language')}>
              {!hiddenPasswordInput ? (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                      <FormLabel className="text-left sm:text-right text-sm">
                        {isProtected ? <span className="mr-0.5 text-red-500">*</span> : null}
                        {t('accessPassword')}
                      </FormLabel>
                      <FormControl>
                        <Input className="col-span-3 clay-input" type="password" placeholder={t('accessPasswordPlaceholder')} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="lang"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                    <FormLabel className="text-left sm:text-right text-sm">{t('language')}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={handleLangChange}>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder={t('followTheSystem')} /></SelectTrigger>
                        <SelectContent><LangOptions /></SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </SettingSection>

            <SettingSection icon={MessageSquare} title={t('maxHistoryLength')}>
              <FormField
                control={form.control}
                name="maxHistoryLength"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                    <FormLabel className="text-left sm:text-right text-sm">{t('maxHistoryLength')}</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex items-center gap-3">
                        <Slider className="flex-1" value={[field.value]} max={50} step={1} onValueChange={(v) => field.onChange(v[0])} />
                        <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary tabular-nums">
                          {field.value === 0 ? '∞' : field.value}
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </SettingSection>

            <SettingSection icon={RefreshCw} title={t('resetSetting')}>
              {pwaInstall ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <Label className="text-left sm:text-right text-sm">{t('installPwa')}</Label>
                  <Button className="col-span-3 justify-start gap-2 hover:bg-primary/5" type="button" variant="ghost" onClick={() => handlePwaInstall()}>
                    <MonitorDown className="h-4 w-4 text-primary" />
                    {t('pwaInstall')}
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                <Label className="text-left sm:text-right text-sm">{t('resetSetting')}</Label>
                <Button
                  className="col-span-3 justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
                  type="button" variant="ghost"
                  onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); handleReset() }}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('resetAllSettings')}
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </SettingSection>
          </div>
        )

      case 'params':
        return (
          <div className="space-y-6">
            <SettingSection icon={Layers} title="Sampling" description="Top-P, Top-K, Temperature">
              <FormField control={form.control} name="topP" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">Top-P</FormLabel>
                  <FormControl><SliderField value={field.value} max={1} step={0.01} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="topK" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">Top-K</FormLabel>
                  <FormControl><SliderField value={field.value} max={128} step={1} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="temperature" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm flex items-center gap-1.5">
                    <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('temperature')}
                  </FormLabel>
                  <FormControl><SliderField value={field.value} max={2} step={0.1} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </SettingSection>

            <SettingSection icon={Hash} title={t('maxOutputTokens')}>
              <FormField control={form.control} name="maxOutputTokens" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('maxOutputTokens')}</FormLabel>
                  <FormControl><SliderField value={field.value} max={8192} step={1} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </SettingSection>

            <SettingSection icon={Shield} title={t('safety')} description="Content safety filter level">
              <FormField control={form.control} name="safety" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('safety')}</FormLabel>
                  <FormControl>
                    <SafetyPills value={field.value} onChange={field.onChange} labels={{
                      none: t('none'), low: t('low'), middle: t('middle'), high: t('high'),
                    }} />
                  </FormControl>
                </FormItem>
              )} />
            </SettingSection>
          </div>
        )

      case 'voice':
        return (
          <div className="space-y-6">
            <SettingSection icon={Mic} title={t('voiceServer')}>
              <FormField control={form.control} name="sttLang" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('speechRecognition')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder={t('followTheSystem')} /></SelectTrigger>
                      <SelectContent><LangOptions /></SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="ttsLang" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('speechSynthesis')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={handleTTSChange}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder={t('followTheSystem')} /></SelectTrigger>
                      <SelectContent><LangOptions /></SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="ttsVoice" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('soundSource')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder={t('followTheSystem')} /></SelectTrigger>
                      <SelectContent>
                        {values(voiceOptions).map((option) => (
                          <SelectItem key={option.value} value={option.value as string}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )} />
            </SettingSection>

            <SettingSection icon={Mic} title="Auto Record">
              <FormField control={form.control} name="autoStartRecord" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('autoStartRecord')}</FormLabel>
                  <FormControl>
                    <div className="col-span-3 flex items-center gap-3">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <span className={`text-xs font-medium transition-colors ${field.value ? 'text-primary' : 'text-muted-foreground'}`}>
                        {field.value ? t('settingEnable') : t('settingDisable')}
                      </span>
                    </div>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="autoStopRecord" render={({ field }) => (
                <FormItem className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-3 space-y-0">
                  <FormLabel className="text-left sm:text-right text-sm">{t('autoStopRecord')}</FormLabel>
                  <FormControl>
                    <div className="col-span-3 flex items-center gap-3">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <span className={`text-xs font-medium transition-colors ${field.value ? 'text-primary' : 'text-muted-foreground'}`}>
                        {field.value ? t('settingEnable') : t('settingDisable')}
                      </span>
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </SettingSection>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <ResponsiveDialog
      className="clay-card max-w-4xl w-full sm:w-[90%] border-0 p-0 shadow-2xl"
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <SlidersHorizontal className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-gradient">{t('setting')}</span>
        </div>
      }
      description={<span className="text-sm text-muted-foreground">{t('settingDescription')}</span>}
      footer={
        <>
          <Button className="cloth-btn clay-btn flex-1 min-h-[44px] gap-2 font-semibold" type="submit" onClick={form.handleSubmit(handleSubmit)}>
            {t('save')}
          </Button>
          <Button className="flex-1 min-h-[44px] max-sm:mt-2" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* ── Dashboard layout: sidebar + content ── */}
          <div className="flex min-h-[420px] sm:min-h-[480px]">
            {/* Sidebar */}
            <nav className="hidden sm:flex w-[180px] shrink-0 flex-col gap-1 border-r border-border/40 pr-4 py-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeMenu === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMenu(item.id)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                )
              })}

              {/* Version footer in sidebar */}
              <div className="mt-auto pt-4 border-t border-border/30">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground leading-tight">DirgaX Chat</span>
                </div>
                <div className="px-3">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    v{pkg.version}
                  </span>
                </div>
              </div>
            </nav>

            {/* Mobile tabs (horizontal) */}
            <div className="sm:hidden flex flex-col w-full">
              <div className="flex gap-1 p-1 mb-3 rounded-xl bg-muted/50">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeMenu === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMenu(item.id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t(item.labelKey)}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex-1 overflow-y-auto px-1">
                {renderContent()}
              </div>
            </div>

            {/* Desktop content */}
            <div className="hidden sm:block flex-1 overflow-y-auto pl-6 py-1">
              {renderContent()}
            </div>
          </div>
        </form>
      </Form>
    </ResponsiveDialog>
  )
}

export default memo(Setting)
