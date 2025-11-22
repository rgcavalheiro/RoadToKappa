# 📦 Sistema de Versionamento

O app possui um sistema automático de versionamento que detecta novas branches e atualiza a versão.

## 📍 Localização

A versão aparece no **canto inferior direito** da aplicação no formato:
```
v0.0.1 by Rgcavalheiro
```

## 🔄 Como Funciona

### Versão Atual
A versão está armazenada em `version.json`:
```json
{
  "version": "0.0.1",
  "author": "Rgcavalheiro"
}
```

### Atualização Automática

**Sistema Principal: Detecção de Nova Branch**
- Quando você cria uma nova branch (ex: `hu06`), o sistema detecta automaticamente
- Incrementa a versão patch automaticamente (0.0.1 → 0.0.2)
- A versão atualizada fica na nova branch
- Quando você faz merge na main, a versão já está atualizada

**Como funciona:**
1. Você cria uma nova branch: `git checkout -b hu06`
2. O hook `post-checkout` detecta que é uma branch nova (não existe no remoto)
3. Incrementa automaticamente a versão (0.0.1 → 0.0.2)
4. Você faz commit da versão atualizada na nova branch
5. Quando mergear na main, a versão já estará atualizada

**Opção Manual (se o hook não funcionar)**
Execute o script Python após criar a branch:
```bash
python check_new_branch.py
```

Ou no Windows:
```bash
check_new_branch.bat
```

### Sistema de Versionamento

- **Patch** (0.0.1 → 0.0.2): Incrementa automaticamente ao criar nova branch
- **Minor** (0.0.1 → 0.1.0): Para atualizações maiores (edite manualmente)
- **Major** (0.0.1 → 1.0.0): Para mudanças significativas (edite manualmente)

### Exemplo de Fluxo

1. **Branch atual (hu05)**: v0.0.1
2. **Criar nova branch**: `git checkout -b hu06`
3. **Sistema detecta**: Branch nova → incrementa para v0.0.2
4. **Commit na hu06**: Versão v0.0.2 commitada
5. **Merge na main**: Versão v0.0.2 vai para main

## 📝 Atualizar Manualmente

Para atualizar manualmente, edite `version.json`:
```json
{
  "version": "0.1.0",  // Altere aqui
  "author": "Rgcavalheiro"
}
```

Depois faça commit:
```bash
git add version.json
git commit -m "chore: Atualizar versão para 0.1.0"
```

## 🎨 Estilização

A versão é exibida com:
- Fundo semi-transparente escuro
- Texto branco
- Posição fixa no canto inferior direito
- Responsivo (menor em mobile)

