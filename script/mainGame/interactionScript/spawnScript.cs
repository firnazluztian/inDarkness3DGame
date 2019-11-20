using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class spawnScript : MonoBehaviour
{
    public GameObject mGameObject;
    public List<GameObject> possibleSpawnPoints = new List<GameObject>();
    private int chosenSpawnPoint = 0;
    private bool onStart = true;

    // Start is called before the first frame update
    void Start()
    {
        chosenSpawnPoint = Random.Range(0, possibleSpawnPoints.Count);
    }

    // Update is called once per frame
    void Update()
    {
        if (onStart == true) {
            if (onStart == true)
            {
                mGameObject.transform.position = possibleSpawnPoints[chosenSpawnPoint].transform.position;
                onStart = false;
            }
        }
    }
}
