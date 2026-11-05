'use client';

import { ListItem, Row, Select, Text } from '@talivia/react-zen';
import { useActiveWorkspace } from '@/components/hooks';
import { Building2 } from '@/components/icons';

const ALL_WORKSPACES = '__all__';

export function WorkspaceSwitcher() {
  const { activeWorkspace, workspaceId, workspaces, save } = useActiveWorkspace();

  if (workspaces.length === 0) {
    return null;
  }

  const items = [
    ...(workspaces.length > 1 ? [{ id: ALL_WORKSPACES, name: 'All workspaces' }] : []),
    ...workspaces.map(workspace => ({ id: workspace.id, name: workspace.name })),
  ];

  return (
    <Select
      aria-label="Workspace"
      value={workspaceId || (workspaces.length > 1 ? ALL_WORKSPACES : workspaces[0].id)}
      onChange={id => save(id === ALL_WORKSPACES ? null : String(id))}
      renderValue={() => (
        <Row alignItems="center" gap="2">
          <Building2 size={16} />
          <Text truncate>{activeWorkspace?.name || 'All workspaces'}</Text>
        </Row>
      )}
      buttonProps={{
        style: {
          minHeight: 40,
          minWidth: 160,
          maxWidth: 240,
        },
      }}
      listProps={{
        style: {
          minWidth: 220,
        },
      }}
    >
      {items.map(item => (
        <ListItem key={item.id} id={item.id}>
          <Text truncate>{item.name}</Text>
        </ListItem>
      ))}
    </Select>
  );
}
